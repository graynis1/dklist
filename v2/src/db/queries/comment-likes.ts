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
 *
 * Extended with a real dislike (`value` column, 1/-1) per the maintainer's
 * explicit "beğenmeme butonları" ask - v1 never had this, a fresh addition
 * layered onto the existing like table rather than a parallel one.
 */
export async function getCommentReactionCounts(commentIds: number[]): Promise<Map<number, { likes: number; dislikes: number }>> {
  if (commentIds.length === 0) return new Map();

  const rows = await db
    .select({
      commentId: commentLike.commentId,
      likes: sql<number>`sum(case when ${commentLike.value} = 1 then 1 else 0 end)`,
      dislikes: sql<number>`sum(case when ${commentLike.value} = -1 then 1 else 0 end)`,
    })
    .from(commentLike)
    .where(inArray(commentLike.commentId, commentIds))
    .groupBy(commentLike.commentId);

  return new Map(rows.map((r) => [r.commentId, { likes: Number(r.likes), dislikes: Number(r.dislikes) }]));
}

export async function getOwnCommentReactions(
  userId: number,
  commentIds: number[],
): Promise<Map<number, 1 | -1>> {
  if (commentIds.length === 0) return new Map();

  const rows = await db
    .select({ commentId: commentLike.commentId, value: commentLike.value })
    .from(commentLike)
    .where(and(eq(commentLike.userId, userId), inArray(commentLike.commentId, commentIds)));

  return new Map(rows.map((r) => [r.commentId, r.value as 1 | -1]));
}

export interface CommentLikeState {
  count: number;
  liked: boolean;
  dislikeCount: number;
  disliked: boolean;
}

/** Combines the lookups above into the shape EntityComments/the feed
 * render - one call per page instead of repeating the merge logic at each
 * call site. `count`/`liked` keep their original meaning (like count/state)
 * for every existing caller; `dislikeCount`/`disliked` are additive. */
export async function getCommentLikeStates(
  userId: number | null,
  commentIds: number[],
): Promise<Record<number, CommentLikeState>> {
  const [counts, own] = await Promise.all([
    getCommentReactionCounts(commentIds),
    userId ? getOwnCommentReactions(userId, commentIds) : Promise.resolve(new Map<number, 1 | -1>()),
  ]);

  const result: Record<number, CommentLikeState> = {};
  for (const id of commentIds) {
    const c = counts.get(id) ?? { likes: 0, dislikes: 0 };
    const reaction = own.get(id);
    result[id] = { count: c.likes, liked: reaction === 1, dislikeCount: c.dislikes, disliked: reaction === -1 };
  }
  return result;
}

/**
 * Sets the caller's reaction (1 = like, -1 = dislike) - re-sending the same
 * value clears it (a real toggle, matching how the old like-only button
 * behaved), sending the other value flips it in one step rather than
 * requiring two clicks.
 */
export async function setCommentReaction(
  userId: number,
  commentId: number,
  value: 1 | -1,
): Promise<{ reaction: 1 | -1 | null }> {
  const [existing] = await db
    .select({ id: commentLike.id, value: commentLike.value })
    .from(commentLike)
    .where(and(eq(commentLike.userId, userId), eq(commentLike.commentId, commentId)))
    .limit(1);

  if (existing) {
    if (existing.value === value) {
      await db.delete(commentLike).where(eq(commentLike.id, existing.id));
      return { reaction: null };
    }
    await db.update(commentLike).set({ value }).where(eq(commentLike.id, existing.id));
    return { reaction: value };
  }

  await db.insert(commentLike).values({ userId, commentId, value });

  // v1's like() notifies the comment's owner - only for a genuine new like,
  // matching the original behavior (no notification spam for dislikes).
  if (value === 1) {
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
  }

  return { reaction: value };
}
