import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { comment, subComment, user } from "@/db/schema";

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
        // v1's getBook() filters out comments from disabled/banned users
        // (checked per-comment in BookController.php) - ported here rather
        // than left out, per the "don't skip v1 details" directive.
        eq(user.disable, 0),
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
): Promise<number> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Yorum en az 2 karakter olmalıdır.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Yorum en fazla 2000 karakter olabilir.");
  }

  const [result] = await db.insert(comment).values({
    userId,
    comment: trimmed,
    commentType,
    type: BOOK_TYPE,
    targetId: bookId,
    date: new Date().toISOString().slice(0, 10),
  });

  updateTag(`book-comments:${bookId}:${commentType}`);
  return result.insertId;
}

export type SubCommentParentType = "comment" | "subComment";

export interface CommentReply {
  id: number;
  text: string;
  authorUsername: string;
  parentType: SubCommentParentType;
  parentId: number;
  replies: CommentReply[];
}

/**
 * v1's CommentController::getComments() unrolls exactly two reply levels
 * (subComment -> nested subComment) even though the sub_comment table's
 * generic parentType/parentId columns would technically allow deeper chains -
 * matched here rather than building true unbounded recursion, since that's
 * the depth the old UI ever actually rendered. Deliberately uncached (like
 * getReadStatus) - reply threads are small per book and need to reflect
 * writes immediately.
 */
export async function getRepliesForComments(
  commentIds: number[],
): Promise<Map<number, CommentReply[]>> {
  if (commentIds.length === 0) return new Map();

  const level1Rows = await db
    .select({
      id: subComment.id,
      text: subComment.comment,
      authorUsername: user.username,
      parentId: subComment.parentId,
    })
    .from(subComment)
    .innerJoin(user, eq(subComment.userId, user.id))
    .where(
      and(
        eq(subComment.parentType, "comment"),
        inArray(subComment.parentId, commentIds),
        eq(user.disable, 0),
      ),
    )
    .orderBy(subComment.id);

  const level1Ids = level1Rows.map((r) => r.id);

  const level2Rows = level1Ids.length
    ? await db
        .select({
          id: subComment.id,
          text: subComment.comment,
          authorUsername: user.username,
          parentId: subComment.parentId,
        })
        .from(subComment)
        .innerJoin(user, eq(subComment.userId, user.id))
        .where(
          and(
            eq(subComment.parentType, "subComment"),
            inArray(subComment.parentId, level1Ids),
            eq(user.disable, 0),
          ),
        )
        .orderBy(subComment.id)
    : [];

  const level2ByParent = new Map<number, CommentReply[]>();
  for (const row of level2Rows) {
    const list = level2ByParent.get(row.parentId) ?? [];
    list.push({ ...row, parentType: "subComment", replies: [] });
    level2ByParent.set(row.parentId, list);
  }

  const byComment = new Map<number, CommentReply[]>();
  for (const row of level1Rows) {
    const list = byComment.get(row.parentId) ?? [];
    list.push({
      ...row,
      parentType: "comment",
      replies: level2ByParent.get(row.id) ?? [],
    });
    byComment.set(row.parentId, list);
  }
  return byComment;
}

export async function addSubComment(
  userId: number,
  parentType: SubCommentParentType,
  parentId: number,
  text: string,
): Promise<number> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Yanıt en az 2 karakter olmalıdır.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Yanıt en fazla 2000 karakter olabilir.");
  }

  const [result] = await db.insert(subComment).values({
    userId,
    comment: trimmed,
    parentType,
    parentId,
  });
  return result.insertId;
}
