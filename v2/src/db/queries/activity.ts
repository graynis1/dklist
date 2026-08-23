import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, comment, user } from "@/db/schema";
import { attachWriterNames } from "@/db/queries/books";

export interface BookActivityItem {
  id: number;
  kind: "yorum" | "alinti";
  username: string;
  bookId: number;
  bookName: string;
  bookSlug: string;
  excerpt: string;
  hasImage: boolean;
  writers: string[];
}

/**
 * Customer's homepage feed spec: any comment/review/quote referencing a book
 * should pull that book's cover thumbnail into the feed. Scoped to
 * book-comments only (not writer/translator - no cover art to show there),
 * and deliberately not merging in ratings: unlike `comment`, the real `score`
 * table has no date/timestamp column at all in the frozen prod schema, so
 * there's no genuine recency to sort a rating by - adding one would be new
 * schema surface with no v1 equivalent, not a small addition. `comment.id`
 * is the same recency proxy `getLatestBooks()` already uses for `book`,
 * which likewise has no `created_at`.
 */
export async function getRecentBookActivity(limit = 10): Promise<BookActivityItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("recent-book-activity");

  const rows = await db
    .select({
      id: comment.id,
      kind: comment.commentType,
      username: user.username,
      bookId: book.id,
      bookName: book.name,
      bookSlug: book.slug,
      text: comment.comment,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.id))
    .innerJoin(book, eq(comment.targetId, book.id))
    .where(and(eq(comment.type, "book"), eq(user.disable, 0)))
    .orderBy(desc(comment.id))
    .limit(limit);

  const withWriters = await attachWriterNames(rows.map((r) => ({ ...r, id: r.bookId })));
  const writersByBookId = new Map(withWriters.map((w) => [w.id, w.writers]));

  return rows.map((r) => ({
    ...r,
    kind: r.kind === "alinti" ? "alinti" : "yorum",
    excerpt: r.text.length > 140 ? `${r.text.slice(0, 140)}...` : r.text,
    hasImage: Boolean(r.hasImage),
    writers: writersByBookId.get(r.bookId) ?? [],
  }));
}

export interface TrendingBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  recentCommentCount: number;
  hasImage: boolean;
  writers: string[];
}

/**
 * "Trend Kitaplar" - a new discovery widget, a third item past the
 * original brainstorm list. Deliberately comment-count-only, not blended
 * with ratings: `comment.date` is a real DATE column, but `score` has no
 * timestamp at all in the frozen prod schema (the same constraint
 * getRecentBookActivity() above already documents) - there's no genuine
 * "this week" window to rank a rating by, so mixing the two would either
 * fake a signal or silently ignore half the intended input. "Most
 * discussed in the last N days" is a real, honest trending signal on its
 * own.
 */
export async function getTrendingBooks(limit = 10, days = 7): Promise<TrendingBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("trending-books");

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      recentCommentCount: sql<number>`count(*)`,
      hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
    })
    .from(comment)
    .innerJoin(book, eq(comment.targetId, book.id))
    .where(and(eq(comment.type, "book"), sql`${comment.date} >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`))
    .groupBy(book.id, book.name, book.slug, book.score, book.image)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  const withWriters = await attachWriterNames(rows.map((r) => ({ ...r, id: r.id })));
  const writersByBookId = new Map(withWriters.map((w) => [w.id, w.writers]));

  return rows.map((r) => ({ ...r, recentCommentCount: Number(r.recentCommentCount), hasImage: Boolean(r.hasImage), writers: writersByBookId.get(r.id) ?? [] }));
}
