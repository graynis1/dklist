import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comment, user } from "@/db/schema";

const BOOK_TYPE = "book";

// Customer's notes were explicit that "yorum yap" (write a review) and
// "alıntı yap" (add a quote) should read as clearly separate things, not
// blended into one generic "posts" feed like v1 did - commentType is the
// column that carries that distinction. Only "yorum" (review) is wired up
// in this pass; "alinti" (quote) reuses the same table/shape, a fast-follow.
export type CommentType = "yorum" | "alinti";

export interface BookComment {
  id: number;
  text: string;
  date: string;
  authorUsername: string;
}

export async function getBookComments(
  bookId: number,
  commentType: CommentType = "yorum",
): Promise<BookComment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`book-comments:${bookId}:${commentType}`);

  const rows = await db
    .select({
      id: comment.id,
      text: comment.comment,
      date: comment.date,
      authorUsername: user.username,
    })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.id))
    .where(
      and(
        eq(comment.targetId, bookId),
        eq(comment.type, BOOK_TYPE),
        eq(comment.commentType, commentType),
      ),
    )
    .orderBy(desc(comment.id));

  return rows;
}

export async function addBookComment(
  userId: number,
  bookId: number,
  text: string,
  commentType: CommentType = "yorum",
): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Yorum en az 2 karakter olmalıdır.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Yorum en fazla 2000 karakter olabilir.");
  }

  await db.insert(comment).values({
    userId,
    comment: trimmed,
    commentType,
    type: BOOK_TYPE,
    targetId: bookId,
    date: new Date().toISOString().slice(0, 10),
  });

  updateTag(`book-comments:${bookId}:${commentType}`);
}
