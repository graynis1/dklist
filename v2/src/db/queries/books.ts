import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql, eq, inArray, desc } from "drizzle-orm";
import { db } from "@/db";
import { category as categoryTable, writer, writerBook, book } from "@/db/schema";
import { translateCategoryName } from "@/lib/category-names";

export interface CategoryBookListItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
}

/**
 * Books in a category, ranked by view count. Ported from v1's raw-SQL fix for a
 * catastrophic query plan (MySQL's optimizer otherwise flattens the category
 * EXISTS check back into a join-then-filesort over the category's full row set -
 * confirmed via a fresh EXPLAIN against the live 98.5M-row book table on
 * 2026-08-20: STRAIGHT_JOIN + FORCE INDEX yields a backward index scan on
 * idx_book_viewcount with zero filesort, `rows` bounded by LIMIT). Do not
 * rewrite this with Drizzle's query builder / relational API - the builder
 * does not expose STRAIGHT_JOIN or FORCE INDEX, and a "cleaner" rewrite here
 * is exactly the kind of change that reintroduces the original incident.
 */
export async function getBooksByCategory(
  categoryId: number,
  limit = 40,
): Promise<CategoryBookListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`category-books:${categoryId}`);

  const rows = (await db.execute(sql`
    SELECT STRAIGHT_JOIN b.id, b.name, b.slug, b.score, b.view_count AS viewCount
    FROM book b FORCE INDEX (idx_book_viewcount)
    WHERE EXISTS (
      SELECT 1 FROM book_category bc
      WHERE bc.book_id = b.id AND bc.category_id = ${categoryId}
    )
    ORDER BY b.view_count DESC
    LIMIT ${limit}
  `))[0] as unknown as Omit<CategoryBookListItem, "writers">[];

  return attachWriterNames(rows);
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CategorySummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`category:${slug}`);

  const [row] = await db
    .select({ id: categoryTable.id, name: categoryTable.category, slug: categoryTable.slug })
    .from(categoryTable)
    .where(eq(categoryTable.slug, slug))
    .limit(1);

  if (!row) return null;
  return { ...row, name: translateCategoryName(row.name) };
}

export interface TopCategory {
  id: number;
  name: string;
  slug: string;
  bookCount: number;
}

/**
 * v1's CategoryController::getAllCategoriesForClient() - the site-wide nav
 * widget. On the real 98.5M-row/508K-category prod table this GROUP BY over
 * ~50M book_category rows was expensive enough that v1 resorted to a 24h
 * file cache with a flock() stampede guard (a live `information_schema`-style
 * count wasn't an option here since book_category needs an actual join to
 * rank by book count, unlike the simpler TABLE_ROWS estimate used elsewhere).
 * `'use cache'` + a long cacheLife is the Cache Components equivalent of that
 * file cache - same reasoning, no hand-rolled flock() needed.
 */
export async function getTopCategories(limit = 50): Promise<TopCategory[]> {
  "use cache";
  cacheLife("days");
  cacheTag("top-categories");

  const rows = (await db.execute(sql`
    SELECT c.id, c.category AS name, c.slug, COUNT(bc.book_id) AS bookCount
    FROM category c
    JOIN book_category bc ON bc.category_id = c.id
    GROUP BY c.id
    ORDER BY bookCount DESC
    LIMIT ${limit}
  `))[0] as unknown as { id: number; name: string; slug: string; bookCount: number }[];

  return rows.map((r) => ({ ...r, name: translateCategoryName(r.name), bookCount: Number(r.bookCount) }));
}

/**
 * Most recently added books, newest first. No `created_at` column exists on
 * `book` (bulk-imported catalog, never had one) - `id DESC` is the closest
 * available proxy for import/insertion order, same assumption v1 made.
 */
export async function getLatestBooks(limit = 12): Promise<CategoryBookListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("latest-books");

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
    })
    .from(book)
    .orderBy(desc(book.id))
    .limit(limit);

  return attachWriterNames(rows);
}

/** Batched (no N+1) writer-name lookup for a list of book ids - shared across
 * category/latest/publisher listing queries so each doesn't reimplement it. */
export async function attachWriterNames<T extends { id: number }>(
  books: T[],
): Promise<(T & { writers: string[] })[]> {
  if (books.length === 0) return [];

  const bookIds = books.map((b) => b.id);
  const writerRows = await db
    .select({ bookId: writerBook.bookId, name: writer.name })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(inArray(writerBook.bookId, bookIds));

  const writersByBook = new Map<number, string[]>();
  for (const row of writerRows) {
    const list = writersByBook.get(row.bookId) ?? [];
    list.push(row.name);
    writersByBook.set(row.bookId, list);
  }

  return books.map((b) => ({ ...b, writers: writersByBook.get(b.id) ?? [] }));
}
