import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { desc, eq, like, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { youtube } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";

/**
 * "Videolar" - customer's explicit ask (2026-09-24): "blog alanının aynısı
 * gibi bir tane videolar sekmesi ekle... youtube video linki eklenerek
 * olacak admin panelden" (a Videos tab like the blog area - added by
 * pasting a YouTube link from the admin panel). Deliberately simpler than
 * blog: admin-only (no Blogger-style multi-author role, no dual-version
 * revision-approval queue - an admin's write is just live, matching v1's
 * own YoutubeController, which was Admin-only end to end).
 *
 * Extends v1's real, pre-existing `youtube` table (6 real rows already on
 * production, see migration 0057) rather than starting a parallel one.
 */

function slugify(input: string): string {
  // Same Turkish-transliteration-before-lowercasing fix already applied
  // across every other admin slugify() in this codebase (book/writer/
  // publisher/translator/category-admin.ts) - toLowerCase() on a bare "İ"
  // produces "i" + a stray combining dot if it runs before this map does.
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Accepts a full YouTube URL (watch/shorts/embed/youtu.be, with or
 * without extra query params like `&si=...`) or a bare video id pasted
 * directly - whatever an admin actually copies out of their browser's
 * address bar or share button. Returns null for anything unrecognizable,
 * rather than guessing. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (urlMatch) return urlMatch[1];
  if (/^[A-Za-z0-9_-]{6,20}$/.test(trimmed)) return trimmed;
  return null;
}

export interface VideoListItem {
  id: number;
  title: string;
  slug: string;
  youtubeVideoId: string | null;
  createdDate: string;
  viewCount: number;
}

/** Public + admin listing share this one function - unlike blog there's no
 * "pending approval" state to distinguish an admin view from a public one,
 * every row here is already live the moment it's created. */
export async function getVideoList(
  page = 1,
  pageSize = 12,
  search = "",
): Promise<{ items: VideoListItem[]; total: number; page: number; lastPage: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("video-list");

  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch ? like(youtube.title, `%${trimmedSearch}%`) : undefined;

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(youtube).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({
      id: youtube.id,
      title: youtube.title,
      slug: youtube.slug,
      youtubeVideoId: youtube.youtubeVideoId,
      createdDate: youtube.createdDate,
      viewCount: youtube.viewCount,
    })
    .from(youtube)
    .where(whereClause)
    .orderBy(desc(youtube.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  return {
    items: rows.map((r) => ({ ...r, viewCount: Number(r.viewCount) })),
    total,
    page: effectivePage,
    lastPage,
  };
}

/** /videolar hero slot - most-viewed, same "featured means most-viewed,
 * not just newest" convention getFeaturedBlogPost() already established. */
export async function getFeaturedVideo(): Promise<VideoListItem | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("video-list");

  const [row] = await db
    .select({
      id: youtube.id,
      title: youtube.title,
      slug: youtube.slug,
      youtubeVideoId: youtube.youtubeVideoId,
      createdDate: youtube.createdDate,
      viewCount: youtube.viewCount,
    })
    .from(youtube)
    .orderBy(desc(youtube.viewCount))
    .limit(1);

  return row ? { ...row, viewCount: Number(row.viewCount) } : null;
}

/** "Diğer Videolar" sidebar on the detail page - same shape as
 * getRecentBlogPosts(). */
export async function getRecentVideos(limit: number, excludeId?: number): Promise<VideoListItem[]> {
  const rows = await db
    .select({
      id: youtube.id,
      title: youtube.title,
      slug: youtube.slug,
      youtubeVideoId: youtube.youtubeVideoId,
      createdDate: youtube.createdDate,
      viewCount: youtube.viewCount,
    })
    .from(youtube)
    .where(excludeId ? ne(youtube.id, excludeId) : undefined)
    .orderBy(desc(youtube.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, viewCount: Number(r.viewCount) }));
}

export interface VideoDetail extends VideoListItem {
  embededCode: string | null;
}

export async function getVideoBySlug(slug: string): Promise<VideoDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`video:${slug}`);

  const [row] = await db
    .select({
      id: youtube.id,
      title: youtube.title,
      slug: youtube.slug,
      youtubeVideoId: youtube.youtubeVideoId,
      embededCode: youtube.embededCode,
      createdDate: youtube.createdDate,
      viewCount: youtube.viewCount,
    })
    .from(youtube)
    .where(eq(youtube.slug, slug))
    .limit(1);

  return row ? { ...row, viewCount: Number(row.viewCount) } : null;
}

export async function getVideoById(id: number): Promise<VideoDetail | null> {
  const [row] = await db
    .select({
      id: youtube.id,
      title: youtube.title,
      slug: youtube.slug,
      youtubeVideoId: youtube.youtubeVideoId,
      embededCode: youtube.embededCode,
      createdDate: youtube.createdDate,
      viewCount: youtube.viewCount,
    })
    .from(youtube)
    .where(eq(youtube.id, id))
    .limit(1);

  return row ? { ...row, viewCount: Number(row.viewCount) } : null;
}

/** Fire-and-forget from the detail page, same "no updateTag - the
 * cacheLife('minutes') window already makes the count eventually
 * consistent" tradeoff as incrementBlogViewCount(). */
export async function incrementVideoViewCount(videoId: number): Promise<void> {
  await db.update(youtube).set({ viewCount: sql`${youtube.viewCount} + 1` }).where(eq(youtube.id, videoId));
}

export async function createVideo(
  title: string,
  youtubeUrlOrId: string,
): Promise<{ status: boolean; message?: string; slug?: string }> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { status: false, message: "Başlık zorunludur." };
  if (isDirty(trimmedTitle)) return { status: false, message: "Başlık uygunsuz içerik barındırıyor." };

  const videoId = extractYouTubeId(youtubeUrlOrId);
  if (!videoId) return { status: false, message: "Geçerli bir YouTube video linki girin." };

  const [result] = await db.insert(youtube).values({
    title: trimmedTitle,
    // Placeholder, replaced right below once the real id exists - same
    // insert-then-slug-with-id pattern used for Askıda Kitap listings,
    // guaranteed collision-free without a separate uniqueness retry loop.
    slug: "temp",
    youtubeVideoId: videoId,
    createdDate: new Date().toISOString().slice(0, 10),
    viewCount: 0,
  });

  const slug = `${slugify(trimmedTitle).slice(0, 60)}-${result.insertId}`;
  await db.update(youtube).set({ slug }).where(eq(youtube.id, result.insertId));

  updateTag("video-list");
  return { status: true, slug };
}

/**
 * Both fields optional/independent (the admin row saves each input
 * on-blur separately, same UX as CategoryAdminRow) - whichever isn't
 * passed keeps its existing value rather than requiring both every time.
 * Slug intentionally stays put on edit (matches writer/translator/
 * publisher-admin.ts's own update() convention, unlike blog's slug-
 * follows-the-title-on-every-edit behavior) - a title typo fix shouldn't
 * silently break an already-shared video link.
 */
export async function updateVideo(
  videoId: number,
  fields: { title?: string; youtubeUrlOrId?: string },
): Promise<{ status: boolean; message?: string }> {
  const [existing] = await db.select().from(youtube).where(eq(youtube.id, videoId)).limit(1);
  if (!existing) return { status: false, message: "Video bulunamadı." };

  let newTitle = existing.title;
  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    if (!trimmed) return { status: false, message: "Başlık zorunludur." };
    if (isDirty(trimmed)) return { status: false, message: "Başlık uygunsuz içerik barındırıyor." };
    newTitle = trimmed;
  }

  let newVideoId = existing.youtubeVideoId;
  if (fields.youtubeUrlOrId !== undefined) {
    const parsed = extractYouTubeId(fields.youtubeUrlOrId);
    if (!parsed) return { status: false, message: "Geçerli bir YouTube video linki girin." };
    newVideoId = parsed;
  }

  await db.update(youtube).set({ title: newTitle, youtubeVideoId: newVideoId }).where(eq(youtube.id, videoId));

  updateTag("video-list");
  updateTag(`video:${existing.slug}`);
  return { status: true };
}

export async function deleteVideo(videoId: number): Promise<{ status: boolean; message?: string }> {
  const [existing] = await db.select({ slug: youtube.slug }).from(youtube).where(eq(youtube.id, videoId)).limit(1);
  if (!existing) return { status: false, message: "Video bulunamadı." };

  await db.delete(youtube).where(eq(youtube.id, videoId));

  updateTag("video-list");
  updateTag(`video:${existing.slug}`);
  return { status: true };
}
