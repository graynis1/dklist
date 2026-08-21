import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql, eq, inArray, desc, asc, and, or, like } from "drizzle-orm";
import { db } from "@/db";
import { category as categoryTable, writer, writerBook, book, read } from "@/db/schema";
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

export interface TopBookItem extends CategoryBookListItem {
  content: string | null;
}

/**
 * v1's GeneralController::getTopItems()/getTopBooks() (top-3 by view count,
 * feeds the homepage). The v2 homepage's "featured"/"picks" sections were
 * still rendering placeholder demoBooks data - this is the real equivalent.
 */
export async function getTopBooks(limit = 5): Promise<TopBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("top-books");

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      content: book.content,
    })
    .from(book)
    .orderBy(desc(book.viewCount))
    .limit(limit);

  return attachWriterNames(rows);
}

export type BookSortBy = "viewCount" | "score" | "name";

export interface BookListItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
}

/**
 * v1's BookController::getAllBooksForClient() (the real client-facing `/books`
 * route behind `KitaplarSayfasi.js`) - the general, unfiltered "Tüm Kitaplar"
 * browse. v1's category/publisher filtering on this same endpoint
 * (`optionID`/`optionType`) is already covered here by the dedicated
 * getBooksByCategory()/getBooksByPublisher() embedded in their own detail
 * pages, so deliberately not duplicated - this covers the genuinely uncovered
 * part: a general catalog browse, plus v1's "sadece okuduklarım" read-status
 * filter (`readQuery`), which doesn't exist anywhere else in v2's book
 * browsing.
 *
 * Ports v1's own real perf choices, not simplified versions of them: prefix-
 * only search on name/orgName (idx_book_name/idx_book_orgname are plain
 * B-tree indexes - a leading-wildcard or LOWER()-wrapped search can't use
 * them, and FULLTEXT repeatedly failed to finish building on this hardware),
 * and the InnoDB TABLE_ROWS estimate instead of COUNT(*) when there's no
 * search/read filter at all - a real COUNT(*) over the ~98.5M-row book table
 * is exactly the class of full-scan that's already burned this project twice.
 */
export async function getBookList(
  page = 1,
  pageSize = 40,
  search = "",
  sortBy: BookSortBy = "viewCount",
  orderBy: "asc" | "desc" = "desc",
  onlyReadByUserId?: number,
): Promise<{ items: BookListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();

  const sortColumn = sortBy === "score" ? book.score : sortBy === "name" ? book.name : book.viewCount;
  const direction = orderBy === "asc" ? asc : desc;

  const searchCondition = trimmedSearch
    ? or(like(book.name, `${trimmedSearch}%`), like(book.orgName, `${trimmedSearch}%`))
    : undefined;

  let total: number;
  let items: BookListItem[];

  if (onlyReadByUserId) {
    // Read-status filter needs a join, so it always runs a real COUNT/query
    // over the (much smaller) per-user joined set - matches v1's own
    // getAllBooksForClient(), which only takes the InnoDB-estimate shortcut
    // when neither search nor readQuery is active.
    const whereClause = searchCondition
      ? and(eq(read.userId, onlyReadByUserId), eq(read.status, "okudum"), searchCondition)
      : and(eq(read.userId, onlyReadByUserId), eq(read.status, "okudum"));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(book)
      .innerJoin(read, eq(read.bookId, book.id))
      .where(whereClause);
    total = Number(countRow?.count ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / safeSize));
    const effectivePage = Math.min(Math.max(1, page), lastPage);

    const rows = await db
      .select({ id: book.id, name: book.name, slug: book.slug, score: book.score, viewCount: book.viewCount })
      .from(book)
      .innerJoin(read, eq(read.bookId, book.id))
      .where(whereClause)
      .orderBy(direction(sortColumn))
      .limit(safeSize)
      .offset((effectivePage - 1) * safeSize);

    items = await attachWriterNames(rows);
    return { items, total, page: effectivePage, lastPage };
  }

  if (!trimmedSearch) {
    const rows = (await db.execute(
      sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book'`,
    ))[0] as unknown as { TABLE_ROWS: number }[];
    total = Number(rows[0]?.TABLE_ROWS ?? 0);
  } else {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(book).where(searchCondition);
    total = Number(countRow?.count ?? 0);
  }

  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({ id: book.id, name: book.name, slug: book.slug, score: book.score, viewCount: book.viewCount })
    .from(book)
    .where(searchCondition)
    .orderBy(direction(sortColumn))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  items = await attachWriterNames(rows);
  return { items, total, page: effectivePage, lastPage };
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
