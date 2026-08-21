import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { blog, user } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { saveUploadedImage } from "@/lib/image-upload";
import { awardPoints, POINT_VALUES } from "@/db/queries/points";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "blog");

export function blogImageUrl(image: string | null): string | null {
  return image ? `/api/blog-image/${image}` : null;
}

function slugifyBlogTitle(title: string, username: string): string {
  // Turkish-character map runs BEFORE toLowerCase() - see book-admin.ts's
  // slugify() for why (JS's toLowerCase() turns İ into "i" + a combining
  // dot, not the plain "i" this map expects, a real bug caught via testing).
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  const normalize = (s: string) =>
    s
      .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${normalize(title.slice(0, 30))}-${normalize(username)}`;
}

export interface BlogListItem {
  id: number;
  title: string;
  preview: string;
  slug: string;
  createdDate: string;
  ownerUsername: string | null;
  img: string | null;
}

/**
 * v1's BlogController::getAll() (public-facing branch, not the admin-panel
 * one): approved-only, search (title/preview/content) + pagination like the
 * real public BloglarSayfasi.js page has (a real search box + page numbers,
 * not just an infinite top-N list), and skips posts whose owner is
 * unverified or disabled - the admin listing sees everything, but this is
 * the public /bloglar page's equivalent. `total`/`lastPage` are computed the
 * same way v1's own `filteredCount` is - from the approved+search filter
 * only, not accounting for the disabled-owner skip applied after the query -
 * so, like v1, a page can legitimately render fewer rows than its own page
 * size when some owners get filtered out; that's v1's real behavior, not a
 * bug introduced here.
 */
export async function getBlogList(
  page = 1,
  pageSize = 10,
  search = "",
): Promise<{ items: BlogListItem[]; total: number; page: number; lastPage: number }> {
  "use cache";
  cacheLife("minutes");
  // One shared tag across every page/search variant (rather than a tag per
  // combination) - simpler, and a write invalidating the whole blog-list
  // cache universe is a fine tradeoff against tracking every variant tag.
  cacheTag("blog-list");

  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? and(
        eq(blog.approved, 1),
        or(
          like(blog.title, `%${trimmedSearch}%`),
          like(blog.preview, `%${trimmedSearch}%`),
          like(blog.content, `%${trimmedSearch}%`),
        ),
      )
    : eq(blog.approved, 1);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(blog).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({
      id: blog.id,
      title: blog.title,
      preview: blog.preview,
      slug: blog.slug,
      createdDate: blog.createdDate,
      image: blog.image,
      ownerUsername: user.username,
      ownerMailAuth: user.mailAuth,
      ownerDisable: user.disable,
    })
    .from(blog)
    .leftJoin(user, eq(blog.ownerId, user.id))
    .where(whereClause)
    .orderBy(desc(blog.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  const items = rows
    .filter((r) => !r.ownerUsername || (r.ownerMailAuth && !r.ownerDisable))
    .map((r) => ({
      id: r.id,
      title: r.title,
      preview: r.preview,
      slug: r.slug,
      createdDate: r.createdDate,
      ownerUsername: r.ownerUsername,
      img: blogImageUrl(r.image),
    }));

  return { items, total, page: effectivePage, lastPage };
}

export interface OwnerBlogItem {
  id: number;
  title: string;
  slug: string;
  approved: boolean;
}

/**
 * v1's profile page shows a "Bloglari" section - the profile owner's own
 * posts, visible to anyone viewing that profile (confirmed by reading
 * BlogsContainer.js, which reads straight off the shared profile response,
 * not gated on isOwnProfile). A viewer who isn't the owner only sees
 * approved posts; the owner also sees their own not-yet-approved drafts,
 * matching the same isOwner-sees-more pattern already used for reading
 * status/pending-revision banners elsewhere in this app.
 */
export async function getBlogsByOwner(ownerId: number, includeUnapproved: boolean): Promise<OwnerBlogItem[]> {
  const whereClause = includeUnapproved ? eq(blog.ownerId, ownerId) : and(eq(blog.ownerId, ownerId), eq(blog.approved, 1));

  const rows = await db
    .select({ id: blog.id, title: blog.title, slug: blog.slug, approved: blog.approved })
    .from(blog)
    .where(whereClause)
    .orderBy(desc(blog.id))
    .limit(50);

  return rows.map((r) => ({ ...r, approved: Boolean(r.approved) }));
}

export interface BlogDetail {
  id: number;
  title: string;
  content: string | null;
  preview: string;
  slug: string;
  createdDate: string;
  approved: boolean;
  img: string | null;
  ownerId: number | null;
  ownerUsername: string | null;
  hasPendingRevision: boolean;
  pendingTitle: string | null;
  pendingContent: string | null;
  pendingPreview: string | null;
  pendingImg: string | null;
}

/**
 * v1's get($slug) - notably does NOT filter by `approved` at all (only the
 * list endpoint does). Matched as-is: direct-link access to an unapproved
 * post works in v1, it just won't appear in any listing. A real behavior,
 * not obviously a bug, so ported faithfully rather than "fixed". Pending-
 * revision fields are always included here (unlike v1, which only sends
 * them to the post's own owner) - the page component decides who actually
 * sees the pending-revision banner, keeping this a plain cacheable read
 * rather than viewer-dependent.
 */
export async function getBlogBySlug(slug: string): Promise<BlogDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`blog:${slug}`);

  const [row] = await db
    .select({
      id: blog.id,
      title: blog.title,
      content: blog.content,
      preview: blog.preview,
      slug: blog.slug,
      createdDate: blog.createdDate,
      approved: blog.approved,
      image: blog.image,
      ownerId: blog.ownerId,
      ownerUsername: user.username,
      hasPendingRevision: blog.hasPendingRevision,
      pendingTitle: blog.pendingTitle,
      pendingContent: blog.pendingContent,
      pendingPreview: blog.pendingPreview,
      pendingImage: blog.pendingImage,
    })
    .from(blog)
    .leftJoin(user, eq(blog.ownerId, user.id))
    .where(eq(blog.slug, slug))
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    preview: row.preview,
    slug: row.slug,
    createdDate: row.createdDate,
    approved: Boolean(row.approved),
    img: blogImageUrl(row.image),
    ownerId: row.ownerId,
    ownerUsername: row.ownerUsername,
    hasPendingRevision: Boolean(row.hasPendingRevision),
    pendingTitle: row.pendingTitle,
    pendingContent: row.pendingContent,
    pendingPreview: row.pendingPreview,
    pendingImg: blogImageUrl(row.pendingImage),
  };
}

const BLOGGER_TYPE = "Blog_Yazari";
const ELEVATED_TYPES = ["Admin", "Mod", "SuperAdmin"];

function validateBlogFields(title: string, preview: string, content: string): string | null {
  if (!title.trim() || !preview.trim() || !content.trim()) {
    return "Blog önizleme, başlık ve içerik zorunludur.";
  }
  if (isDirty(title) || isDirty(preview) || isDirty(content)) {
    return "Hakaret içeren içerik ekleyemezsiniz.";
  }
  return null;
}

export async function createBlogPost(
  ownerId: number,
  ownerUsername: string,
  title: string,
  preview: string,
  content: string,
  imageFile: File,
): Promise<{ status: boolean; message?: string; slug?: string }> {
  const validationError = validateBlogFields(title, preview, content);
  if (validationError) return { status: false, message: validationError };
  if (!imageFile || imageFile.size === 0) {
    return { status: false, message: "Blog resmi zorunludur." };
  }

  let imageName: string;
  try {
    imageName = await saveUploadedImage("blog", imageFile);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }

  const slug = slugifyBlogTitle(title, ownerUsername);
  const [result] = await db.insert(blog).values({
    ownerId,
    title,
    preview,
    content,
    image: imageName,
    createdDate: new Date().toISOString().slice(0, 10),
    slug,
    approved: 0,
    viewCount: 0,
    hasPendingRevision: 0,
  });

  updateTag("blog-list");
  return { status: true, slug };
}

/**
 * v1's update($id) - the dual-version revision system: a Blogger editing
 * their own already-approved post never touches the live version directly;
 * the edit sits in pending* columns until an Admin approves/rejects it via
 * setApproveBlog(). An editor/admin/mod edit, or a Blogger editing their own
 * not-yet-approved draft, applies immediately (no live version to protect).
 */
export async function updateBlogPost(
  userId: number,
  userType: string,
  blogId: number,
  title: string,
  preview: string,
  content: string,
  imageFile: File | null,
): Promise<{ status: boolean; message?: string; pending?: boolean }> {
  const [existing] = await db.select().from(blog).where(eq(blog.id, blogId)).limit(1);
  if (!existing) return { status: false, message: "Blog bulunamadı." };

  const isOwner = existing.ownerId === userId;
  const isElevated = ELEVATED_TYPES.includes(userType);
  if (!isOwner && !isElevated) {
    return { status: false, message: "Bu yazıyı düzenleme yetkiniz yok." };
  }

  const validationError = validateBlogFields(title, preview, content);
  if (validationError) return { status: false, message: validationError };

  const isBloggerEditingLivePost = userType === BLOGGER_TYPE && Boolean(existing.approved);

  if (isBloggerEditingLivePost) {
    if (existing.pendingImage) {
      await unlink(path.join(UPLOAD_DIR, existing.pendingImage)).catch(() => {});
    }
    let pendingImageName = existing.pendingImage;
    if (imageFile && imageFile.size > 0) {
      try {
        pendingImageName = await saveUploadedImage("blog", imageFile);
      } catch (err) {
        return { status: false, message: (err as Error).message };
      }
    } else {
      pendingImageName = null;
    }

    await db
      .update(blog)
      .set({
        pendingTitle: title,
        pendingContent: content,
        pendingPreview: preview,
        pendingImage: pendingImageName,
        hasPendingRevision: 1,
      })
      .where(eq(blog.id, blogId));

    updateTag(`blog:${existing.slug}`);
    return {
      status: true,
      pending: true,
      message: "Değişiklikleriniz onaya gönderildi. Onaylanana kadar mevcut yayındaki yazınız görünmeye devam edecek.",
    };
  }

  const [ownerRow] = await db.select({ username: user.username }).from(user).where(eq(user.id, existing.ownerId!)).limit(1);
  const newSlug = slugifyBlogTitle(title, ownerRow?.username ?? "");

  let imageName = existing.image;
  if (imageFile && imageFile.size > 0) {
    if (existing.image) {
      await unlink(path.join(UPLOAD_DIR, existing.image)).catch(() => {});
    }
    try {
      imageName = await saveUploadedImage("blog", imageFile);
    } catch (err) {
      return { status: false, message: (err as Error).message };
    }
  }

  await db
    .update(blog)
    .set({
      title,
      content,
      preview,
      slug: newSlug,
      image: imageName,
      // A Blogger's own edit to a not-yet-approved post still needs
      // re-approval; an editor/admin/mod edit doesn't - they already have
      // publish authority.
      approved: userType === BLOGGER_TYPE ? 0 : existing.approved,
    })
    .where(eq(blog.id, blogId));

  updateTag("blog-list");
  updateTag(`blog:${existing.slug}`);
  if (newSlug !== existing.slug) updateTag(`blog:${newSlug}`);
  return { status: true, pending: false, message: "Blog güncellendi." };
}

/**
 * v1's delete($id) had a real ownership bug: it checked whether the POST'S
 * OWNER was a Blogger-type user, not whether the CALLER was - meaning any
 * Blogger could delete any other Blogger's post as long as neither was the
 * owner. update() already carries an explicit fixed isOwner-or-elevated
 * check (with a comment describing the same class of bug) - applied
 * consistently here instead of reproducing the older, inconsistent check.
 */
export async function deleteBlogPost(
  userId: number,
  userType: string,
  blogId: number,
): Promise<{ status: boolean; message?: string }> {
  const [existing] = await db.select().from(blog).where(eq(blog.id, blogId)).limit(1);
  if (!existing) return { status: false, message: "Blog bulunamadı." };

  const isOwner = existing.ownerId === userId;
  const isElevated = ELEVATED_TYPES.includes(userType);
  if (!isOwner && !isElevated) {
    return { status: false, message: "Bu yazıyı silme yetkiniz yok." };
  }

  if (existing.image) await unlink(path.join(UPLOAD_DIR, existing.image)).catch(() => {});
  if (existing.pendingImage) await unlink(path.join(UPLOAD_DIR, existing.pendingImage)).catch(() => {});

  await db.delete(blog).where(eq(blog.id, blogId));
  updateTag("blog-list");
  updateTag(`blog:${existing.slug}`);
  return { status: true };
}

export interface AdminBlogListItem {
  id: number;
  title: string;
  slug: string;
  approved: boolean;
  hasPendingRevision: boolean;
  ownerUsername: string | null;
}

/**
 * Admin/Mod-only - the moderation-queue branch of v1's getAll(), unfiltered
 * by approval status (unlike the public /bloglar list). Ports the same
 * search (title/preview/content) + pagination v1's admin branch has -
 * matches v1's own pagePerSize cap of 100. Ordered newest-first rather than
 * v1's default ASC-by-id: a moderation queue is more useful with the newest
 * pending posts on top, a deliberate improvement over the raw port rather
 * than an oversight.
 */
export async function getAdminBlogList(
  page: number,
  pageSize: number,
  search: string,
): Promise<{ items: AdminBlogListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();

  const whereClause = trimmedSearch
    ? or(
        like(blog.title, `%${trimmedSearch}%`),
        like(blog.preview, `%${trimmedSearch}%`),
        like(blog.content, `%${trimmedSearch}%`),
      )
    : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(blog)
    .where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      approved: blog.approved,
      hasPendingRevision: blog.hasPendingRevision,
      ownerUsername: user.username,
    })
    .from(blog)
    .leftJoin(user, eq(blog.ownerId, user.id))
    .where(whereClause)
    .orderBy(desc(blog.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  const items = rows.map((r) => ({ ...r, approved: Boolean(r.approved), hasPendingRevision: Boolean(r.hasPendingRevision) }));
  return { items, total, page: effectivePage, lastPage };
}

/**
 * v1's setApproveBlog($id) - if a pending revision exists, approve/reject
 * only resolves *that* revision (the live post's approved flag is left
 * alone, since it was already live); otherwise it toggles the post's own
 * initial approval.
 */
export async function setBlogApproval(blogId: number, approve: boolean): Promise<{ status: boolean; message?: string }> {
  const [existing] = await db.select().from(blog).where(eq(blog.id, blogId)).limit(1);
  if (!existing) return { status: false, message: "Blog bulunamadı." };

  if (existing.hasPendingRevision) {
    if (approve) {
      if (existing.pendingImage) {
        if (existing.image) await unlink(path.join(UPLOAD_DIR, existing.image)).catch(() => {});
      }
      const [ownerRow] = await db.select({ username: user.username }).from(user).where(eq(user.id, existing.ownerId!)).limit(1);
      const newSlug = slugifyBlogTitle(existing.pendingTitle ?? existing.title, ownerRow?.username ?? "");
      await db
        .update(blog)
        .set({
          title: existing.pendingTitle ?? existing.title,
          content: existing.pendingContent ?? existing.content,
          preview: existing.pendingPreview ?? existing.preview,
          image: existing.pendingImage ?? existing.image,
          slug: newSlug,
          pendingTitle: null,
          pendingContent: null,
          pendingPreview: null,
          pendingImage: null,
          hasPendingRevision: 0,
        })
        .where(eq(blog.id, blogId));
    } else {
      if (existing.pendingImage) await unlink(path.join(UPLOAD_DIR, existing.pendingImage)).catch(() => {});
      await db
        .update(blog)
        .set({ pendingTitle: null, pendingContent: null, pendingPreview: null, pendingImage: null, hasPendingRevision: 0 })
        .where(eq(blog.id, blogId));
    }
  } else {
    await db.update(blog).set({ approved: approve ? 1 : 0 }).where(eq(blog.id, blogId));
    if (approve && existing.ownerId) {
      await awardPoints(existing.ownerId, POINT_VALUES.blogPublished, "blog_published", `blog_publish:${blogId}`);
    }
  }

  updateTag("blog-list");
  updateTag(`blog:${existing.slug}`);
  return { status: true };
}
