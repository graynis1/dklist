import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc, asc, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { writer, writerBook, book } from "@/db/schema";
import { containsPattern } from "@/lib/sql-like";

export interface WriterDetail {
  id: number;
  name: string;
  slug: string;
  biyo: string | null;
  score: number;
}

export async function getWriterBySlug(slug: string): Promise<WriterDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`writer:${slug}`);

  const [row] = await db
    .select({
      id: writer.id,
      name: writer.name,
      slug: writer.slug,
      biyo: writer.biyo,
      score: writer.score,
    })
    .from(writer)
    .where(eq(writer.slug, slug))
    .limit(1);

  return row ?? null;
}

export interface WriterBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
}

export interface WriterListItem {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  score: number;
}

/**
 * v1's WriterController::getAllWritersForClient() - the real public
 * "Yazarlar" browse page's data source (v2 had NO writers-index page at all
 * before this; the header nav's "Yazarlar" link was a deliberate dead `#`
 * placeholder until now). Search is substring (LOWER(name) LIKE %term%,
 * unlike Askıda Kitap's prefix-only search), matching v1 exactly.
 *
 * Ports a real, deliberate v1 performance choice: with no search filter, the
 * total count comes from `information_schema.TABLES.TABLE_ROWS` (a fast
 * InnoDB estimate) rather than `COUNT(*)` - the same optimization already
 * applied to book-count-with-no-filter (see books.ts / the "use InnoDB
 * table-row estimate" commit) applied here for the same reason: `writer` has
 * ~11.3M rows on the real prod table, and an unfiltered COUNT(*) there would
 * be a real full-table-scan cost on the HDD-backed instance, not a
 * hypothetical one.
 */
export async function getWriterList(
  page = 1,
  pageSize = 40,
  search = "",
): Promise<{ items: WriterListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  // Both sides go through MySQL's own LOWER(), not JS's - see publishers.ts's
  // getPublisherList for why (Turkish İ lowercases differently in JS vs
  // MySQL, a real bug caught via testing).
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${writer.name})`, sql`LOWER(${containsPattern(trimmedSearch)})`)
    : undefined;

  let total: number;
  if (!trimmedSearch) {
    const rows = (await db.execute(
      sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writer'`,
    ))[0] as unknown as { TABLE_ROWS: number }[];
    total = Number(rows[0]?.TABLE_ROWS ?? 0);
  } else {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(writer).where(whereClause);
    total = Number(countRow?.count ?? 0);
  }

  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({ id: writer.id, name: writer.name, slug: writer.slug, image: writer.img, score: writer.score })
    .from(writer)
    .where(whereClause)
    .orderBy(asc(writer.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  return { items: rows, total, page: effectivePage, lastPage };
}

export async function getBooksByWriter(writerId: number): Promise<WriterBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`writer-books:${writerId}`);

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(writerBook)
    .innerJoin(book, eq(writerBook.bookId, book.id))
    .where(eq(writerBook.writerId, writerId))
    .orderBy(desc(book.viewCount));

  return rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) }));
}
