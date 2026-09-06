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
 *
 * Third real incident (2026-09-06): the branch decision above used the
 * FILTERED bucket size (trCount/nonTrCount) as the "subset" signal - wrong.
 * The category-first branch's cost is `SELECT ... FROM book_category bc
 * WHERE bc.category_id = X` BEFORE the lang filter is even applied (lang
 * lives on `book`, not `book_category`, so every matching category row
 * gets joined to `book` and checked one at a time) - its cost tracks the
 * category's TOTAL row count, not whichever lang-filtered subset happens
 * to be small. A category that's 2.2M Turkish + 3K non-Turkish still makes
 * MySQL materialize-and-filesort all 2,203,000 rows to paginate the
 * 3K-row "not-tr" bucket - confirmed live via EXPLAIN (`rows: 4528976`,
 * "Using temporary; Using filesort") on a real stuck query, same disease
 * as the getCategoryCandidatePool incident below, just with the tr/not-tr
 * split instead of a specific language. Fixed by gating on `total`
 * (already fetched via the cheap, days-cached getCategoryBookCount) for
 * BOTH buckets, not the bucket's own filtered count.
 *
 * That fix alone isn't sufficient for the "large" branch either, though:
 * confirmed live that walking `book` by GLOBAL view_count DESC (the
 * existing plan) checking `EXISTS(category) AND lang = 'tr'` per row can
 * itself run for minutes when Turkish books happen to cluster at low
 * view-counts within a category dominated by other languages (this
 * session's real category-31 example: 882 Turkish books, all with
 * view_count 0-1, buried under 2M+ higher-viewed non-Turkish books).
 * Scoped the "tr" bucket to a new `(lang, view_count)` composite index
 * (migration 0044) instead, bounding its walk by Turkish's own ~126K-book
 * population rather than the whole ~98.5M-row table. The "not-tr" bucket
 * is deliberately left on the existing global-index plan - a composite
 * index keyed on a single lang value can't serve a "not equal to" scan
 * the same way, and every category observed live so far has non-Turkish
 * as the dominant majority (making that bucket's own EXISTS/lang filter
 * cheap to satisfy near the top of the view_count order) - a category
 * where Turkish is instead the overwhelming majority would need the same
 * treatment for its "not-tr" bucket, not yet observed as a real incident,
 * flagged here rather than built speculatively.
 */
const LARGE_CATEGORY_SUBSET_THRESHOLD = 20_000;

async function fetchCategoryPage(
  categoryId: number,
  lang: "tr" | "not-tr",
  totalCategorySize: number,
  limit: number,
  offset: number,
): Promise<Omit<CategoryBookListItem, "writers">[]> {
  const langCondition = lang === "tr" ? sql`b.lang = 'tr'` : sql`b.lang != 'tr'`;

  // EMERGENCY CIRCUIT BREAKER (2026-09-06): both branches below are raw,
  // hand-tuned query plans this file already documents as having gone
  // catastrophic THREE separate times on this HDD-backed instance despite
  // each looking correct via EXPLAIN at the time. `MAX_EXECUTION_TIME`
  // makes MySQL itself abort a query past this budget with a catchable
  // error, instead of running for however long it takes (confirmed live:
  // 20+ minutes, multiple concurrent instances, dragging every other
  // query on the instance down with it) - converts "hangs the whole site"
  // into "this one request fails fast", which the caller now falls back
  // from gracefully. This is a safety net, not a performance fix - a
  // request that hits this budget still shows a degraded result, not the
  // real one.
  if (totalCategorySize < LARGE_CATEGORY_SUBSET_THRESHOLD) {
    try {
      const rows = (await db.execute(sql`
        SELECT /*+ MAX_EXECUTION_TIME(8000) */ STRAIGHT_JOIN b.id, b.name, b.slug, b.score, b.view_count AS viewCount,
          (b.image IS NOT NULL AND b.image != '') AS hasImage
        FROM book_category bc
        INNER JOIN book b ON b.id = bc.book_id
        WHERE bc.category_id = ${categoryId} AND ${langCondition}
        ORDER BY b.view_count DESC
        LIMIT ${limit} OFFSET ${offset}
      `))[0];
      return rows as unknown as Omit<CategoryBookListItem, "writers">[];
    } catch {
      return [];
    }
  }

  // TEMPORARY (2026-09-06): the lang-scoped idx_book_lang_viewcount index
  // (migration 0044) was deliberately NOT deployed with this fix - its
  // online build was competing for disk I/O with the live site badly
  // enough on this HDD-backed instance to make every page hang, and got
  // aborted mid-build to restore service. Falls back to the same global
  // idx_book_viewcount + EXISTS(category) plan both branches already used
  // before this incident - not as fast for a sparse-language-in-a-huge-
  // category case as the scoped index would be, but it's what was already
  // safely running in production, and correctly gated on TOTAL category
  // size now (the actual bug fixed this pass) rather than the wrong,
  // filtered-count signal. Revisit once the index can be rebuilt during
  // low-traffic hours - see PLAN.md for the incident writeup.
  try {
    const rows = (await db.execute(sql`
      SELECT /*+ MAX_EXECUTION_TIME(8000) */ STRAIGHT_JOIN b.id, b.name, b.slug, b.score, b.view_count AS viewCount,
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
  } catch {
    return [];
  }
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

  const items: Omit<CategoryBookListItem, "writers">[] = [];

  if (offset < trCount) {
    const trRows = await fetchCategoryPage(categoryId, "tr", total, safeSize, offset);
    items.push(...trRows);
  }

  if (items.length < safeSize) {
    const remaining = safeSize - items.length;
    const nonTrOffset = Math.max(0, offset - trCount);
    const otherRows = await fetchCategoryPage(categoryId, "not-tr", total, remaining, nonTrOffset);
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
 * that join is a genuine `book`-table random-access lookup per row. Cached
 * with a long `days` life so that expensive join only ever runs cold once
 * per category per cache period, never per-request.
 *
 * Real production incident (2026-09-06): this used to join category-first
 * (`book_category bc STRAIGHT_JOIN book b ... WHERE category_id = X AND
 * lang = 'tr'`) - cost bound by the category's TOTAL size regardless of
 * how few Turkish books it actually contains, confirmed live stuck 134-
 * 326+ seconds on real categories (31, 55) as part of the same incident
 * documented on `fetchCategoryPage` above. Turkish turns out to be a
 * small global minority in this catalog (confirmed: 125,926 of ~98.5M
 * books total, most of the catalog is non-Turkish metadata) - flipped to
 * scan lang-first via the existing `idx_book_lang` index instead, bounded
 * by that ~126K-row population regardless of which category is queried,
 * rather than the category's own (potentially multi-million-row) size.
 */
export async function getCategoryTurkishCount(categoryId: number): Promise<number> {
  "use cache";
  cacheLife("days");
  cacheTag(`category-tr-count:${categoryId}`);

  // Same emergency circuit breaker as fetchCategoryPage above - falls
  // back to 0 (treated as "no Turkish books in this category yet") on
  // timeout rather than hanging; a wrong 0 here just means that category
  // temporarily shows as if it had no Turkish bucket, not a crash.
  try {
    const rows = (await db.execute(sql`
      SELECT /*+ MAX_EXECUTION_TIME(8000) */ COUNT(*) AS n FROM book b FORCE INDEX (idx_book_lang)
      WHERE b.lang = 'tr' AND EXISTS (
        SELECT 1 FROM book_category bc WHERE bc.book_id = b.id AND bc.category_id = ${categoryId}
      )
    `))[0] as unknown as { n: number }[];
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
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
 * file cache with a flock() stampede guard - noted here at the time as a
 * real concern, "no hand-rolled flock() needed" because `'use cache'` was
 * assumed to be the Cache Components equivalent.
 *
 * EMERGENCY PRODUCTION INCIDENT (2026-09-06): that assumption was wrong,
 * and it took the site down. `'use cache'` does NOT provide the same
 * single-flight stampede protection v1's flock() guard did - confirmed
 * live that this exact query takes 6+ minutes to run cold (494,653 real
 * category rows, not the "~508K" estimate above, still the same order of
 * magnitude), and every concurrent visitor hitting a cold cache
 * independently triggered a fresh multi-minute execution of it, all
 * competing for the same disk on this HDD-backed instance - a real
 * cache-stampede pileup, not a single slow query. Real users
 * refreshing an unresponsive homepage repeatedly only fed the stampede.
 *
 * TEMPORARY MITIGATION: the live query is replaced with a static snapshot
 * of its own real output, captured directly from production seconds
 * before this fix (not fabricated data - the actual top-50 result the
 * query itself returned). This removes the expensive query from the
 * request path entirely so the stampede cannot recur, at the cost of the
 * category list going stale until this is replaced with a real fix - a
 * genuine, deliberate, disclosed tradeoff to stop an active outage, not a
 * permanent design. Follow-up needed: either a real single-flight lock
 * around this computation (matching what v1's flock() actually did), a
 * scheduled/precomputed refresh outside the request path, or addressing
 * the root data-quality issue (494,653 categories is itself almost
 * certainly duplicate/messy import data, not a real taxonomy size -
 * matches this project's own known, already-flagged category-clutter
 * backlog).
 */
const TOP_CATEGORIES_SNAPSHOT_2026_09_06: TopCategory[] = [
  { id: 31, name: "Fiction", slug: "fiction-31", bookCount: 2215001 },
  { id: 13, name: "History", slug: "history-13", bookCount: 1576299 },
  { id: 6, name: "Politics and government", slug: "politics-and-government-6", bookCount: 684197 },
  { id: 19, name: "Biography", slug: "biography-19", bookCount: 644215 },
  { id: 689, name: "Children's fiction", slug: "children-s-fiction-689", bookCount: 468131 },
  { id: 51, name: "Congresses", slug: "congresses-51", bookCount: 438500 },
  { id: 42, name: "Criticism and interpretation", slug: "criticism-and-interpretation-42", bookCount: 367738 },
  { id: 45, name: "Education", slug: "education-45", bookCount: 328737 },
  { id: 146, name: "Description and travel", slug: "description-and-travel-146", bookCount: 317173 },
  { id: 55, name: "Bibliography", slug: "bibliography-55", bookCount: 265243 },
  { id: 297, name: "Exhibitions", slug: "exhibitions-297", bookCount: 245805 },
  { id: 1490, name: "Bible", slug: "bible-1490", bookCount: 220853 },
  { id: 524, name: "Religion", slug: "religion-524", bookCount: 212083 },
  { id: 25, name: "Social life and customs", slug: "social-life-and-customs-25", bookCount: 199465 },
  { id: 64, name: "Economic conditions", slug: "economic-conditions-64", bookCount: 188536 },
  { id: 175, name: "Art", slug: "art-175", bookCount: 187466 },
  { id: 53, name: "History and criticism", slug: "history-and-criticism-53", bookCount: 184876 },
  { id: 449, name: "Catalogs", slug: "catalogs-449", bookCount: 183705 },
  { id: 347, name: "World War", slug: "world-war-347", bookCount: 180493 },
  { id: 1781, name: "Juvenile literature", slug: "juvenile-literature-1781", bookCount: 167841 },
  { id: 81, name: "Foreign relations", slug: "foreign-relations-81", bookCount: 158028 },
  { id: 20, name: "Social conditions", slug: "social-conditions-20", bookCount: 157607 },
  { id: 22, name: "Civilization", slug: "civilization-22", bookCount: 153366 },
  { id: 2699, name: "United States", slug: "united-states-2699", bookCount: 150503 },
  { id: 460, name: "Guidebooks", slug: "guidebooks-460", bookCount: 147979 },
  { id: 33, name: "Antiquities", slug: "antiquities-33", bookCount: 144939 },
  { id: 182, name: "Economic policy", slug: "economic-policy-182", bookCount: 144807 },
  { id: 2028, name: "Poetry (poetic works by one author)", slug: "poetry-poetic-works-by-one-author--2028", bookCount: 141218 },
  { id: 411, name: "Philosophy", slug: "philosophy-411", bookCount: 140846 },
  { id: 109, name: "Sources", slug: "sources-109", bookCount: 136372 },
  { id: 132, name: "Drama", slug: "drama-132", bookCount: 135905 },
  { id: 39, name: "Law", slug: "law-39", bookCount: 133170 },
  { id: 955, name: "English language", slug: "english-language-955", bookCount: 128591 },
  { id: 61, name: "Architecture", slug: "architecture-61", bookCount: 127096 },
  { id: 168, name: "Early works to 1800", slug: "early-works-to-1800-168", bookCount: 121291 },
  { id: 822, name: "Mathematics", slug: "mathematics-822", bookCount: 116485 },
  { id: 221, name: "Law and legislation", slug: "law-and-legislation-221", bookCount: 115330 },
  { id: 285, name: "Science", slug: "science-285", bookCount: 114679 },
  { id: 273, name: "Women", slug: "women-273", bookCount: 114377 },
  { id: 164, name: "Agriculture", slug: "agriculture-164", bookCount: 113825 },
  { id: 290, name: "Poetry", slug: "poetry-290", bookCount: 113058 },
  { id: 622, name: "Pictorial works", slug: "pictorial-works-622", bookCount: 111285 },
  { id: 3440, name: "Business", slug: "business-3440", bookCount: 108778 },
  { id: 49, name: "Correspondence", slug: "correspondence-49", bookCount: 106344 },
  { id: 215, name: "Dictionaries", slug: "dictionaries-215", bookCount: 105692 },
  { id: 1000, name: "Catholic Church", slug: "catholic-church-1000", bookCount: 104930 },
  { id: 846, name: "Commentaries", slug: "commentaries-846", bookCount: 102392 },
  { id: 45226, name: "Bills", slug: "bills-45226", bookCount: 100840 },
  { id: 92, name: "Jews", slug: "jews-92", bookCount: 100833 },
  { id: 453, name: "Economics", slug: "economics-453", bookCount: 99097 },
];

export async function getTopCategories(limit = 50): Promise<TopCategory[]> {
  "use cache";
  cacheLife("days");
  cacheTag("top-categories");

  return TOP_CATEGORIES_SNAPSHOT_2026_09_06.slice(0, limit).map((r) => ({ ...r, name: translateCategoryName(r.name) }));
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
