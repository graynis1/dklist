import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc, asc, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { publisher, book } from "@/db/schema";
import { attachWriterNames } from "@/db/queries/books";

export interface PublisherDetail {
  id: number;
  name: string;
  slug: string;
}

export async function getPublisherBySlug(slug: string): Promise<PublisherDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`publisher:${slug}`);

  const [row] = await db
    .select({ id: publisher.id, name: publisher.name, slug: publisher.slug })
    .from(publisher)
    .where(eq(publisher.slug, slug))
    .limit(1);

  return row ?? null;
}

export interface PublisherListItem {
  id: number;
  name: string;
  slug: string;
}

/**
 * v1's PublisherController::getAll() (the real client-facing branch, route
 * `/publisher/get` - `getAllPublishersForUser()` is a separate bounded-500
 * dropdown helper, not this). Real v1 perf choice ported: no search filter ->
 * count from `information_schema.TABLES.TABLE_ROWS` (fast InnoDB estimate)
 * rather than `COUNT(*)`, since `publisher` has ~4.6M rows on the real prod
 * table (confirmed via the same reasoning already applied to `writer`) and
 * an unfiltered COUNT(*) there would be a real full-table-scan cost on the
 * HDD-backed instance.
 */
export async function getPublisherList(
  page = 1,
  pageSize = 40,
  search = "",
): Promise<{ items: PublisherListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim().toLowerCase();
  const whereClause = trimmedSearch ? like(sql`LOWER(${publisher.name})`, `%${trimmedSearch}%`) : undefined;

  let total: number;
  if (!trimmedSearch) {
    const rows = (await db.execute(
      sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publisher'`,
    ))[0] as unknown as { TABLE_ROWS: number }[];
    total = Number(rows[0]?.TABLE_ROWS ?? 0);
  } else {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(publisher).where(whereClause);
    total = Number(countRow?.count ?? 0);
  }

  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const items = await db
    .select({ id: publisher.id, name: publisher.name, slug: publisher.slug })
    .from(publisher)
    .where(whereClause)
    .orderBy(asc(publisher.name))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  return { items, total, page: effectivePage, lastPage };
}

export interface PublisherBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
}

export async function getBooksByPublisher(publisherId: number): Promise<PublisherBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`publisher-books:${publisherId}`);

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
    })
    .from(book)
    .where(eq(book.publisherId, publisherId))
    .orderBy(desc(book.viewCount));

  return attachWriterNames(rows);
}
