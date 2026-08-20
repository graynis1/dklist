import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentLike, comment, user } from "@/db/schema";
import { addNotification } from "@/db/queries/notifications";

/**
 * v1's CommentController::like() - a per-comment like, on the separate
 * comment_like table, distinct from the book/writer/translator likes
 * (user_book/user_writer/user_translator) built earlier. Deliberately
 * uncached (per-comment counts on a page with few comments, needs to
 * reflect a just-added like immediately).
 */
export async function getCommentLikeCounts(commentIds: number[]): Promise<Map<number, number>> {
  if (commentIds.length === 0) return new Map();

  const rows = await db
    .select({ commentId: commentLike.commentId, n: sql<number>`count(*)` })
    .from(commentLike)
    .where(inArray(commentLike.commentId, commentIds))
    .groupBy(commentLike.commentId);

  return new Map(rows.map((r) => [r.commentId, r.n]));
}

export async function getLikedCommentIds(
  userId: number,
  commentIds: number[],
): Promise<Set<number>> {
  if (commentIds.length === 0) return new Set();

  const rows = await db
    .select({ commentId: commentLike.commentId })
    .from(commentLike)
    .where(and(eq(commentLike.userId, userId), inArray(commentLike.commentId, commentIds)));

  return new Set(rows.map((r) => r.commentId));
}

export interface CommentLikeState {
  count: number;
  liked: boolean;
}

/** Combines the two lookups above into the shape EntityComments renders -
 * one call per page instead of repeating the merge logic at each call site. */
export async function getCommentLikeStates(
  userId: number | null,
  commentIds: number[],
): Promise<Record<number, CommentLikeState>> {
  const [counts, liked] = await Promise.all([
    getCommentLikeCounts(commentIds),
    userId ? getLikedCommentIds(userId, commentIds) : Promise.resolve(new Set<number>()),
  ]);

  const result: Record<number, CommentLikeState> = {};
  for (const id of commentIds) {
    result[id] = { count: counts.get(id) ?? 0, liked: liked.has(id) };
  }
  return result;
}

export async function toggleCommentLike(
  userId: number,
  commentId: number,
): Promise<{ liked: boolean }> {
  const [existing] = await db
    .select({ id: commentLike.id })
    .from(commentLike)
    .where(and(eq(commentLike.userId, userId), eq(commentLike.commentId, commentId)))
    .limit(1);

  if (existing) {
    await db.delete(commentLike).where(eq(commentLike.id, existing.id));
    return { liked: false };
  }

  await db.insert(commentLike).values({ userId, commentId });

  // v1's like() notifies the comment's owner - the one place in
  // CommentController that actually calls NotifyManager (new comments/
  // replies themselves don't notify anyone in v1, confirmed by reading the
  // full controller - only likes do).
  const [commentRow] = await db
    .select({ userId: comment.userId, text: comment.comment })
    .from(comment)
    .where(eq(comment.id, commentId))
    .limit(1);
  const [liker] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);

  if (commentRow && liker) {
    const excerpt = commentRow.text.length > 40 ? `${commentRow.text.slice(0, 40)}...` : commentRow.text;
    await addNotification(
      commentRow.userId,
      userId,
      `" ${liker.username} " sizin "${excerpt}" şeklindeki gönderinizi beğendi.`,
      `"${liker.username}" liked your post: "${excerpt}".`,
    );
  }

  return { liked: true };
}
