import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher, writer, writerBook, category, bookCategory, translator, translatorBook, read, user, score } from "@/db/schema";
import { rankByContentSimilarity } from "@/db/queries/book-embedding";
import { getCategoryBookCount } from "@/db/queries/books";

export interface BookDetail {
  id: number;
  name: string;
  orgName: string;
  slug: string;
  score: number;
  viewCount: number;
  pageNumber: number;
  workId: number | null;
  lang: string;
  hasImage: boolean;
  /** Real publisher-provided description, when the catalog has one (rare
   * for the bulk-imported data). Distinct from aiSummary - never blended. */
  content: string | null;
  /** Locally-generated (Ollama) foreword-style blurb - only ever shown
   * with an explicit AI-generated label, see migration 0027. */
  aiSummary: string | null;
  publisher: { id: number; name: string; slug: string } | null;
  writers: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
  translators: { id: number; name: string; slug: string }[];
}

export async function getBookBySlug(slug: string): Promise<BookDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book:${slug}`);

  const [row] = await db
    .select({
      id: book.id,
      name: book.name,
      orgName: book.orgName,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      pageNumber: book.pageNumber,
      workId: book.workId,
      lang: book.lang,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      content: book.content,
      aiSummary: book.aiSummary,
      publisherId: publisher.id,
      publisherName: publisher.name,
      publisherSlug: publisher.slug,
    })
    .from(book)
    .leftJoin(publisher, eq(book.publisherId, publisher.id))
    .where(eq(book.slug, slug))
    .limit(1);

  if (!row) return null;

  const writerRows = await db
    .select({ id: writer.id, name: writer.name, slug: writer.slug })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(eq(writerBook.bookId, row.id));

  const categoryRows = await db
    .select({ id: category.id, name: category.category, slug: category.slug })
    .from(bookCategory)
    .innerJoin(category, eq(bookCategory.categoryId, category.id))
    .where(eq(bookCategory.bookId, row.id));

  const translatorRows = await db
    .select({ id: translator.id, name: translator.name, slug: translator.slug })
    .from(translatorBook)
    .innerJoin(translator, eq(translatorBook.translatorId, translator.id))
    .where(eq(translatorBook.bookId, row.id));

  return {
    id: row.id,
    name: row.name,
    orgName: row.orgName,
    slug: row.slug,
    score: row.score,
    viewCount: Number(row.viewCount),
    pageNumber: row.pageNumber,
    workId: row.workId,
    lang: row.lang,
    hasImage: Boolean(row.hasImage),
    content: row.content,
    aiSummary: row.aiSummary,
    publisher: row.publisherId
      ? { id: row.publisherId, name: row.publisherName!, slug: row.publisherSlug! }
      : null,
    writers: writerRows,
    categories: categoryRows,
    translators: translatorRows,
  };
}

export interface WorkPooledScore {
  avgScore: number;
  editionCount: number;
  voteCount: number;
}

/**
 * Customer's rating/edition-model spec: show BOTH "bu baskı puanı" (this
 * edition's own score) and the pooled score across all editions/
 * translations of the same work. Only meaningful once `work_id` is
 * actually populated across editions - the real Phase 5 fuzzy-matching
 * backfill hasn't run against prod yet (needs the isbn index decision),
 * so this returns null for any book still on its own island, which is
 * every book on the real site today. Built now so the UI is ready the
 * moment that backfill lands, rather than a follow-up feature later.
 *
 * Real bug found and fixed (2026-09-02, live customer report): the first
 * version did `avg(book.score)` grouped by workId - averaging each
 * EDITION's own already-averaged score, unweighted by how many actual
 * votes back it. A work with 7 editions where only one has ever been
 * rated (say 8/10 from a single voter, the other 6 sitting at the
 * unrated default of 0) would show avg(8,0,0,0,0,0,0) ≈ 1.1/10 instead
 * of the correct 8/10 - silently punishing exactly the books that need
 * pooling the most (thin per-edition vote counts). Fixed by averaging
 * the raw `score` votes directly across every book row sharing this
 * workId, so the result is a real vote-weighted mean, not a mean of
 * means - and the count returned is real total votes cast, not edition
 * count, per the customer's expectation ("toplam oy").
 */
export async function getWorkPooledScore(workId: number): Promise<WorkPooledScore | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`work-score:${workId}`);

  const [[editionRow], [voteRow]] = await Promise.all([
    db.select({ editionCount: sql<number>`count(*)` }).from(book).where(eq(book.workId, workId)),
    db
      .select({ avgScore: sql<number>`avg(${score.score})`, voteCount: sql<number>`count(*)` })
      .from(score)
      .innerJoin(book, eq(score.targetId, book.id))
      .where(and(eq(book.workId, workId), eq(score.targetType, "book"))),
  ]);

  if (!editionRow || Number(editionRow.editionCount) <= 1) return null;
  if (!voteRow || Number(voteRow.voteCount) === 0) return null;

  return {
    avgScore: Number(voteRow.avgScore),
    editionCount: Number(editionRow.editionCount),
    voteCount: Number(voteRow.voteCount),
  };
}

export interface WorkEdition {
  id: number;
  name: string;
  slug: string;
  lang: string;
  score: number;
  hasImage: boolean;
}

export interface WorkEditionGroups {
  sameLanguage: WorkEdition[];
  otherLanguages: Record<string, WorkEdition[]>;
}

/**
 * Customer's rating/edition-model spec: editions listed under a book page
 * should group by language, the browsing-language's editions shown first/
 * expanded, other languages collapsed. Same low-visibility-until-Phase-5-
 * backfill caveat as getWorkPooledScore() - returns empty groups for every
 * real book today since work_id groupings aren't populated on prod yet.
 */
export async function getWorkEditions(workId: number, excludeBookId: number, currentLang: string): Promise<WorkEditionGroups> {
  "use cache";
  cacheLife("hours");
  cacheTag(`work-editions:${workId}`);

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      lang: book.lang,
      score: book.score,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(book)
    .where(eq(book.workId, workId));

  const sameLanguage: WorkEdition[] = [];
  const otherLanguages: Record<string, WorkEdition[]> = {};

  for (const raw of rows) {
    const row = { ...raw, hasImage: Boolean(raw.hasImage) };
    if (row.id === excludeBookId) continue;
    if (row.lang === currentLang) {
      sameLanguage.push(row);
    } else {
      (otherLanguages[row.lang] ??= []).push(row);
    }
  }

  return { sameLanguage, otherLanguages };
}

export interface BookReader {
  id: number;
  username: string;
  image: string | null;
  status: string;
}

/**
 * "Bu kitabı okuyan üyeler" - direct customer ask (per PLAN.md/memory:
 * "Kitaba girince bu kitabı okuyan üyeler kısmı yok"), ported from v1's
 * getBook() which builds this from every `read` row for the book (v1 did
 * not filter by disabled users here, unlike comments - matched deliberately,
 * not an oversight, since v1's own code didn't filter it either).
 */
export async function getBookReaders(bookId: number, limit = 12): Promise<BookReader[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`book-readers:${bookId}`);

  return db
    .select({ id: user.id, username: user.username, image: user.image, status: read.status })
    .from(read)
    .innerJoin(user, eq(read.userId, user.id))
    .where(eq(read.bookId, bookId))
    .limit(limit);
}

/** Total distinct readers (any status), for the "X okur" stat - 1000kitap
 * style book-level statistics the customer asked for. Cheap and indexed
 * (read.book_id already has IDX_9857416716A2B381), unlike the rank query
 * below which is a deliberate, bounded exception to this project's usual
 * "avoid COUNT(*) on huge tables" caution. */
export async function getBookReaderCount(bookId: number): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`book-readers:${bookId}`);

  const [row] = await db.select({ n: sql<number>`count(*)` }).from(read).where(eq(read.bookId, bookId));
  return Number(row?.n ?? 0);
}

export interface BookCategoryRank {
  categoryName: string;
  rank: number;
  totalInCategory: number;
}

/**
 * "Rank vs similar books" (customer's ask, 1000kitap-style) - rank by score
 * within the book's first listed category. A real, deliberate exception to
 * this project's usual "avoid COUNT(*) on huge tables" rule (book has
 * ~98.5M rows on prod) - `book_category` is indexed on `category_id`
 * already, and this is the same category-scoped aggregate shape
 * `getTopCategories()` already accepts across ALL categories at once, just
 * narrowed to one. Genuinely large categories could still make this slow on
 * prod - worth revisiting with a real EXPLAIN against prod data before this
 * ships, same caution applied to every other hot-path query this session.
 */
export async function getBookCategoryRank(
  bookId: number,
  categoryId: number,
  categoryName: string,
  score: number,
): Promise<BookCategoryRank> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book-rank:${bookId}`);

  const [[higher], [total]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(bookCategory)
      .innerJoin(book, eq(bookCategory.bookId, book.id))
      .where(and(eq(bookCategory.categoryId, categoryId), gt(book.score, score))),
    db.select({ n: sql<number>`count(*)` }).from(bookCategory).where(eq(bookCategory.categoryId, categoryId)),
  ]);

  return { categoryName, rank: Number(higher?.n ?? 0) + 1, totalInCategory: Number(total?.n ?? 0) };
}

export interface SimilarBook {
  id: number;
  name: string;
  slug: string;
  score: number;
  hasImage: boolean;
  writers: string[];
}

/**
 * The expensive part of "Benzer Kitaplar", split out so it can be cached
 * purely by categoryId - shared across every book in the category, not
 * re-run per book viewed. A real prod incident (2026-09-02) caught the
 * previous version joining bookCategory->book with no STRAIGHT_JOIN/FORCE
 * INDEX and ORDER BY book.score DESC: for a large category (~4.5M rows)
 * MySQL chose to scan the whole join result into a temp table and filesort
 * it rather than use idx_book_score, and because `bookId` (the *excluded*
 * book) was itself a parameter of the old cached function, every distinct
 * book page produced a fresh cache miss - the same catastrophic query
 * fired concurrently for every book in a popular category and queued up
 * against this HDD-backed instance for 20-35 minutes each, stalling the
 * whole site. Forcing the scan to start from `book` via idx_book_score
 * (verified via EXPLAIN: backward index scan, rows≈limit, no filesort)
 * fixes the plan; excluding the current book in JS instead of SQL is what
 * makes the query cacheable by categoryId alone.
 *
 * Second incident, same day, same root disease: this book-first plan is
 * itself only fast when the category is a meaningful fraction of the
 * table - for a small/obscure category (confirmed on prod: several
 * homepage recent-activity categories had as few as 16-290 books) there
 * aren't enough matches for the backward index scan to ever satisfy
 * `poolSize`, so it walks deep into the ~98.5M-row book table instead -
 * the exact same failure already fixed for getBooksByCategory
 * (books.ts), just missed here on the first pass since only a large
 * category (31) was tested before shipping. Same fix: pick the join
 * order from the already-known category size (getCategoryBookCount is
 * a cheap index-only count, cached for days) - small categories start
 * from book_category and filesort the tiny result instead.
 */
const LARGE_CATEGORY_POOL_THRESHOLD = 20_000;

async function getCategoryCandidatePool(
  categoryId: number,
  poolSize: number,
): Promise<Omit<SimilarBook, "writers">[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`similar-books:${categoryId}`);

  const categorySize = await getCategoryBookCount(categoryId);

  const rows = (
    categorySize < LARGE_CATEGORY_POOL_THRESHOLD
      ? (await db.execute(sql`
          SELECT STRAIGHT_JOIN b.id, b.name, b.slug, b.score,
            (b.image IS NOT NULL AND b.image != '') AS hasImage
          FROM book_category bc
          INNER JOIN book b ON b.id = bc.book_id
          WHERE bc.category_id = ${categoryId}
          ORDER BY b.score DESC
          LIMIT ${poolSize}
        `))[0]
      : (await db.execute(sql`
          SELECT STRAIGHT_JOIN b.id, b.name, b.slug, b.score,
            (b.image IS NOT NULL AND b.image != '') AS hasImage
          FROM book b FORCE INDEX (idx_book_score)
          WHERE EXISTS (
            SELECT 1 FROM book_category bc
            WHERE bc.book_id = b.id AND bc.category_id = ${categoryId}
          )
          ORDER BY b.score DESC
          LIMIT ${poolSize}
        `))[0]
  ) as unknown as Omit<SimilarBook, "writers">[];

  return rows.map((row) => ({ ...row, hasImage: Boolean(row.hasImage) }));
}

/**
 * "Benzer Kitaplar" - starts from the same first-category+score candidate
 * pool as before (anonymous visitors too, no personalization needed), then
 * re-ranks by actual content/theme similarity ("Book DNA" - local ONNX
 * embeddings, see src/lib/embeddings.ts) whenever both the target book and
 * a candidate have one computed. Falls back to the plain score ordering
 * for any candidate still missing an embedding - most books do until
 * they're re-saved/re-approved, this isn't a backfilled dataset yet. The
 * candidate-pool query is cached by categoryId (see getCategoryCandidatePool);
 * this outer function stays uncached since it's cheap once that pool is
 * warm (filter + rerank over ≤limit*4 rows, one writer lookup).
 */
export async function getSimilarBooks(bookId: number, categoryId: number, limit = 6): Promise<SimilarBook[]> {
  // Pull a wider candidate pool than needed so the content re-rank below
  // has real room to reorder, not just the same top-6-by-score every time,
  // plus a small margin since the current book (excluded below, not in SQL
  // so the pool query stays cacheable across every book in this category)
  // might itself be one of the top results.
  const pool = await getCategoryCandidatePool(categoryId, limit * 4 + 4);
  const rows = pool.filter((r) => r.id !== bookId).slice(0, limit * 4);

  if (rows.length === 0) return [];

  const rankedIds = await rankByContentSimilarity(bookId, rows.map((r) => r.id));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const topRows = rankedIds.slice(0, limit).map((id) => byId.get(id)!);

  const bookIds = topRows.map((r) => r.id);
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

  return topRows.map((r) => ({ ...r, writers: writersByBook.get(r.id) ?? [] }));
}
