import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { comment, commentLike, subComment } from "@/db/schema";
import type { CommentTargetType } from "@/db/queries/comments";

/**
 * Ports v1's real admin-delete comment cleanup (identical inline block
 * duplicated in BookController::delete/PublisherController::delete/
 * TranslatorController::delete/WriterController::delete): a comment on the
 * entity being deleted has no DB-level cascade to its sub_comment replies,
 * their own nested replies, or the top-level comment's likes (all three are
 * Doctrine app-layer `orphanRemoval`, not real FK ON DELETE clauses) - delete
 * bottom-up or MySQL rejects the whole chain with a FK violation.
 */
export async function deleteCommentTreeForTarget(targetType: CommentTargetType, targetId: number): Promise<void> {
  const comments = await db.select({ id: comment.id }).from(comment)
    .where(and(eq(comment.type, targetType), eq(comment.targetId, targetId)));
  if (comments.length === 0) return;
  const commentIds = comments.map((c) => c.id);

  const topReplies = await db.select({ id: subComment.id }).from(subComment)
    .where(and(eq(subComment.parentType, "comment"), inArray(subComment.parentId, commentIds)));
  if (topReplies.length > 0) {
    const topReplyIds = topReplies.map((r) => r.id);
    await db.delete(subComment).where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, topReplyIds)));
    await db.delete(subComment).where(inArray(subComment.id, topReplyIds));
  }

  await db.delete(commentLike).where(inArray(commentLike.commentId, commentIds));
  await db.delete(comment).where(inArray(comment.id, commentIds));
}
