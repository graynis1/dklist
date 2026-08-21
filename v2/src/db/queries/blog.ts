import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { blog, user } from "@/db/schema";

export interface BlogListItem {
  id: number;
  title: string;
  preview: string;
  slug: string;
  createdDate: string;
  ownerUsername: string | null;
}

/**
 * v1's BlogController::getAll() (public-facing branch, not the admin-panel
 * one): approved-only, and skips posts whose owner is unverified or
 * disabled - the admin listing sees everything, but this is the public
 * /bloglar page's equivalent. No `image` field rendered here yet - v2 has
 * no blog-image upload path built (that's part of the write-side flow,
 * correctly deferred to Phase 4 along with posting/editing itself), so
 * there's nothing real to serve.
 */
export async function getBlogList(limit = 20): Promise<BlogListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("blog-list");

  const rows = await db
    .select({
      id: blog.id,
      title: blog.title,
      preview: blog.preview,
      slug: blog.slug,
      createdDate: blog.createdDate,
      ownerUsername: user.username,
      ownerMailAuth: user.mailAuth,
      ownerDisable: user.disable,
    })
    .from(blog)
    .leftJoin(user, eq(blog.ownerId, user.id))
    .where(eq(blog.approved, 1))
    .orderBy(desc(blog.id))
    .limit(limit * 2); // over-fetch since some rows get filtered below, matching v1's continue-based skip

  return rows
    .filter((r) => !r.ownerUsername || (r.ownerMailAuth && !r.ownerDisable))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      title: r.title,
      preview: r.preview,
      slug: r.slug,
      createdDate: r.createdDate,
      ownerUsername: r.ownerUsername,
    }));
}

export interface BlogDetail {
  id: number;
  title: string;
  content: string | null;
  preview: string;
  slug: string;
  createdDate: string;
  ownerUsername: string | null;
}

/**
 * v1's get($slug) - notably does NOT filter by `approved` at all (only the
 * list endpoint does). Matched as-is: direct-link access to an unapproved
 * post works in v1, it just won't appear in any listing. A real behavior,
 * not obviously a bug, so ported faithfully rather than "fixed".
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
      ownerUsername: user.username,
    })
    .from(blog)
    .leftJoin(user, eq(blog.ownerId, user.id))
    .where(eq(blog.slug, slug))
    .limit(1);

  return row ?? null;
}
