import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
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
    writers: writersByBookId.get(r.bookId) ?? [],
  }));
}
