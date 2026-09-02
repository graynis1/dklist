import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql, eq, inArray, desc, asc, and, or, like, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { db } from "@/db";
import { category as categoryTable, writer, writerBook, book, read, bookCategory } from "@/db/schema";
import { translateCategoryName } from "@/lib/category-names";

export interface CategoryBookListItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
  writers: string[];
}

/**
 * Books in a category, ranked by view count, Turkish editions first (real
 * customer ask: "Kategorilerde Türkçe en ilk sırada listelenmişti daha önce
 * uygulamada çok iyi olur" - restoring a v1 behavior). Ported from v1's
 * raw-SQL fix for a catastrophic query plan (MySQL's optimizer otherwise
 * flattens the category EXISTS check back into a join-then-filesort over the
 * category's full row set - confirmed via a fresh EXPLAIN against the live
 * 98.5M-row book table on 2026-08-20: STRAIGHT_JOIN + FORCE INDEX yields a
 * backward index scan on idx_book_viewcount with zero filesort, `rows`
 * bounded by LIMIT). Do not rewrite this with Drizzle's query builder /
 * relational API - the builder does not expose STRAIGHT_JOIN or FORCE INDEX,
 * and a "cleaner" rewrite here is exactly the kind of change that
 * reintroduces the original incident.
 *
 * Real complication found while adding this: a single `ORDER BY (lang='tr')
 * DESC, view_count DESC` reintroduces exactly that catastrophic plan - some
 * categories have 2M+ books (confirmed on prod: category 31 has 2,215,001),
 * and EXPLAIN confirmed that compound sort forces "Using temporary; Using
 * filesort" over the whole category (millions of rows) since no index can
 * satisfy it. Fixed by running two separate FORCE-INDEX queries (Turkish-
 * only, then everything else), each individually still hitting the same
 * fast backward-index-scan plan (confirmed via EXPLAIN: adding `AND
 * b.lang = 'tr'` to the existing WHERE does NOT break the index scan), and
 * splicing pages across the boundary using the cached Turkish count below -
 * zero filesort at any point.
 *
 * Second real incident (2026-09-02): the book-first backward-index-scan
 * plan above is only fast when the category is a large fraction of the
 * table - MySQL walks `book` in view_count-descending order and stops once
 * it collects LIMIT matches. For a small category (confirmed on prod:
 * category 95900 has 15 books total, all non-Turkish) there aren't enough
 * matches to ever satisfy the LIMIT, so MySQL scans the *entire* ~98.5M-row
 * book table before concluding there's nothing left - stuck 24+ minutes in
 * production, part of the same incident that also hit getSimilarBooks.
 * Fixed by choosing the join order from the already-known subset size: for
 * a small subset, start from `book_category` (index range scan on
 * category_id, ~instant) and filesort the tiny result instead - confirmed
 * via EXPLAIN + live timing (0.067s for category 95900) that a filesort
 * over a few thousand rows is a non-issue, it's only catastrophic at
 * millions of rows.
 */
const LARGE_CATEGORY_SUBSET_THRESHOLD = 20_000;

async function fetchCategoryPage(
  categoryId: number,
  lang: "tr" | "not-tr",
  subsetCount: number,
  limit: number,
  offset: number,
): Promise<Omit<CategoryBookListItem, "writers">[]> {
  const langCondition = lang === "tr" ? sql`b.lang = 'tr'` : sql`b.lang != 'tr'`;

  const rows =
    subsetCount < LARGE_CATEGORY_SUBSET_THRESHOLD
      ? (await db.execute(sql`
          SELECT STRAIGHT_JOIN b.id, b.name, b.slug, b.score, b.view_count AS viewCount,
            (b.image IS NOT NULL AND b.image != '') AS hasImage
          FROM book_category bc
          INNER JOIN book b ON b.id = bc.book_id
          WHERE bc.category_id = ${categoryId} AND ${langCondition}
          ORDER BY b.view_count DESC
          LIMIT ${limit} OFFSET ${offset}
        `))[0]
      : (await db.execute(sql`
          SELECT STRAIGHT_JOIN b.id, b.name, b.slug, b.score, b.view_count AS viewCount,
            (b.image IS NOT NULL AND b.image != '') AS hasImage
          FROM book b FORCE INDEX (idx_book_viewcount)
          WHERE EXISTS (
            SELECT 1 FROM book_category bc
            WHERE bc.book_id = b.id AND bc.category_id = ${categoryId}
          ) AND ${langCondition}
          ORDER BY b.view_count DESC
          LIMIT ${limit} OFFSET ${offset}
        `))[0];

  return rows as unknown as Omit<CategoryBookListItem, "writers">[];
}

export async function getBooksByCategory(
  categoryId: number,
  page = 1,
  pageSize = 40,
): Promise<{ items: CategoryBookListItem[]; total: number; trCount: number; lastPage: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(`category-books:${categoryId}`);

  const safeSize = Math.min(100, Math.max(1, pageSize));
  const [total, trCount] = await Promise.all([
    getCategoryBookCount(categoryId),
    getCategoryTurkishCount(categoryId),
  ]);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const offset = (safePage - 1) * safeSize;
  const nonTrCount = total - trCount;

  const items: Omit<CategoryBookListItem, "writers">[] = [];

  if (offset < trCount) {
    const trRows = await fetchCategoryPage(categoryId, "tr", trCount, safeSize, offset);
    items.push(...trRows);
  }

  if (items.length < safeSize) {
    const remaining = safeSize - items.length;
    const nonTrOffset = Math.max(0, offset - trCount);
    const otherRows = await fetchCategoryPage(categoryId, "not-tr", nonTrCount, remaining, nonTrOffset);
    items.push(...otherRows);
  }

  const withWriters = await attachWriterNames(items.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
  return { items: withWriters, total, trCount, lastPage };
}

/** Cheap - book_category has a covering index on category_id, no join to
 * `book` needed at all (confirmed via EXPLAIN: "Using index", ~350ms even on
 * the largest real category at 2.2M rows). */
export async function getCategoryBookCount(categoryId: number): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag(`category-book-count:${categoryId}`);

  const [row] = await db.select({ n: sql<number>`count(*)` }).from(bookCategory).where(eq(bookCategory.categoryId, categoryId));
  return Number(row?.n ?? 0);
}

/**
 * Real trap found via direct testing: counting Turkish books in a category
 * needs a join to `book` (book_category alone doesn't carry `lang`), and
 * that join is a genuine `book`-table random-access lookup per row - timed
 * out past 60s on category 31's 2.2M rows on this HDD-backed instance, the
 * same disk-IO cost class already documented elsewhere in this file. Cached
 * with a long `days` life so that expensive join only ever runs cold once
 * per category per cache period, never per-request.
 */
export async function getCategoryTurkishCount(categoryId: number): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag(`category-tr-count:${categoryId}`);

  const rows = (await db.execute(sql`
    SELECT COUNT(*) AS n FROM book_category bc STRAIGHT_JOIN book b ON b.id = bc.book_id
    WHERE bc.category_id = ${categoryId} AND b.lang = 'tr'
  `))[0] as unknown as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

/**
 * Generalizes getCategoryTurkishCount() to any language - real production
 * incident (2026-09-02): getSimilarBooks' language-aware candidate pool
 * (book-detail.ts) decided its book-first-vs-bookCategory-first query
 * strategy using the category's TOTAL size (all languages combined), then
 * applied the language filter on top of whichever plan that picked. A
 * large category with very few books in a specific language (confirmed on
 * prod: category 100/863 had almost no Ukrainian books, category 2028
 * almost no Italian) still got the "large category" book-first plan, which
 * degrades to the same near-full-table-scan already fixed for the
 * language-agnostic case - one real request stuck 12+ minutes. The actual
 * selectivity that matters is the (category, language) pair, not the
 * category alone - this answers that directly, same cached-days pattern.
 */
export async function getCategoryLangCount(categoryId: number, lang: string): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag(`category-lang-count:${categoryId}:${lang}`);

  const rows = (await db.execute(sql`
    SELECT COUNT(*) AS n FROM book_category bc STRAIGHT_JOIN book b ON b.id = bc.book_id
    WHERE bc.category_id = ${categoryId} AND b.lang = ${lang}
  `))[0] as unknown as { n: number }[];
  return Number(rows[0]?.n ?? 0);
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
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(book)
    .orderBy(desc(book.id))
    .limit(limit);

  return attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
}

export interface RecommendedBook extends CategoryBookListItem {
  readerOverlap: number;
}

/**
 * Customer's ask: "Book recommendations section (Netflix-style, based on
 * past preference/history), not just static category browsing." Built as
 * plain collaborative filtering (no AI/paid API needed, matching the
 * standing no-paid-services constraint): find "neighbor" readers who share
 * at least one "finishRead" book with the viewer, then recommend whichever of
 * THEIR "finishRead" books the viewer hasn't read yet, ranked by how many
 * neighbors read it. Same underlying overlap technique as
 * getFollowSuggestions() (profile.ts), applied to books instead of people.
 * Not cached - genuinely per-viewer.
 */
export async function getRecommendedBooks(viewerId: number, limit = 8): Promise<RecommendedBook[]> {
  const viewerRead = alias(read, "viewer_read");
  const neighborRead = alias(read, "neighbor_read");
  const candidateRead = alias(read, "candidate_read");
  const viewerHasCandidate = alias(read, "viewer_has_candidate");

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      readerOverlap: sql<number>`count(distinct ${neighborRead.userId})`,
    })
    .from(viewerRead)
    .innerJoin(
      neighborRead,
      and(
        eq(viewerRead.bookId, neighborRead.bookId),
        eq(viewerRead.status, "finishRead"),
        eq(neighborRead.status, "finishRead"),
        sql`${neighborRead.userId} != ${viewerId}`,
      ),
    )
    .innerJoin(candidateRead, and(eq(candidateRead.userId, neighborRead.userId), eq(candidateRead.status, "finishRead")))
    .innerJoin(book, eq(candidateRead.bookId, book.id))
    .leftJoin(
      viewerHasCandidate,
      and(eq(viewerHasCandidate.userId, viewerId), eq(viewerHasCandidate.bookId, candidateRead.bookId)),
    )
    .where(and(eq(viewerRead.userId, viewerId), isNull(viewerHasCandidate.id)))
    .groupBy(book.id, book.name, book.slug, book.score, book.viewCount, book.image)
    .orderBy(sql`count(distinct ${neighborRead.userId}) desc`, desc(book.score))
    .limit(limit);

  const withWriters = await attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
  return withWriters as RecommendedBook[];
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
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(book)
    .orderBy(desc(book.viewCount))
    .limit(limit);

  return attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
}

export type BookSortBy = "viewCount" | "score" | "name";

export interface BookListItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
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
  // The real "aşırı yavaş" complaint: this was the only listing query in the
  // whole module with no 'use cache' at all, so /kitaplar re-ran the full
  // TABLE_ROWS-estimate + ORDER BY viewCount query against the live
  // ~98.5M-row `book` table on every single request. Confirmed via a
  // production round-trip (cold: ~45s, warm: ~80ms) that this is genuinely
  // disk-IO cold-cache latency on the HDD-backed instance, not a bad query
  // plan - the same class of cost that's already justified caching every
  // other book-list query in this file. cacheTag is param-shaped (not a
  // single fixed key) since results differ per page/search/sort/user.
  "use cache";
  cacheLife("hours");
  cacheTag(`book-list:${page}:${pageSize}:${search}:${sortBy}:${orderBy}:${onlyReadByUserId ?? "all"}`);

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
      ? and(eq(read.userId, onlyReadByUserId), eq(read.status, "finishRead"), searchCondition)
      : and(eq(read.userId, onlyReadByUserId), eq(read.status, "finishRead"));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(book)
      .innerJoin(read, eq(read.bookId, book.id))
      .where(whereClause);
    total = Number(countRow?.count ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / safeSize));
    const effectivePage = Math.min(Math.max(1, page), lastPage);

    const rows = await db
      .select({
        id: book.id,
        name: book.name,
        slug: book.slug,
        score: book.score,
        viewCount: book.viewCount,
        hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      })
      .from(book)
      .innerJoin(read, eq(read.bookId, book.id))
      .where(whereClause)
      .orderBy(direction(sortColumn))
      .limit(safeSize)
      .offset((effectivePage - 1) * safeSize);

    items = await attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
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
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(book)
    .where(searchCondition)
    .orderBy(direction(sortColumn))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  items = await attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
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
