import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher, writer, writerBook, category, bookCategory, translator, translatorBook, read, user } from "@/db/schema";

export interface BookDetail {
  id: number;
  name: string;
  orgName: string;
  slug: string;
  score: number;
  viewCount: number;
  pageNumber: number;
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
    publisher: row.publisherId
      ? { id: row.publisherId, name: row.publisherName!, slug: row.publisherSlug! }
      : null,
    writers: writerRows,
    categories: categoryRows,
    translators: translatorRows,
  };
}

export interface BookReader {
  id: number;
  username: string;
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
    .select({ id: user.id, username: user.username, status: read.status })
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
