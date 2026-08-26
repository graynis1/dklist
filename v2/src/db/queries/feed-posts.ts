import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { feedPost, feedPostLike, subComment, user, pointTransaction } from "@/db/schema";
import { awardPointsWithDailyCap, getPointSettings } from "@/db/queries/points";
import { checkModerationOrThrow, notifyHashtaggedReaders, type CommentReply } from "@/db/queries/comments";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/image-upload";

/**
 * The one genuine "post" concept the app never had - a standalone status
 * update (text and/or an image), independent of any book/writer/
 * translator. Maintainer's explicit ask to turn /akis into a real social
 * platform rather than just a nicer view of catalog comments.
 *
 * Feeds into the same point_transaction-driven activity stream as every
 * other feed reason (see feed.ts's FEED_REASONS) - awardPoints's own
 * `reason: "feed_post", reasonKey: "feed_post:<id>"` is both the points
 * ledger entry AND the row getSiteFeed() joins back against, so no second
 * feed/pagination system was needed for the new content type to show up.
 */
export async function createFeedPost(userId: number, text: string, image: File | null): Promise<number> {
  const trimmed = text.trim();
  if (!trimmed && (!image || image.size === 0)) {
    throw new Error("Bir metin yazın veya bir görsel ekleyin.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Gönderi en fazla 2000 karakter olabilir.");
  }
  if (trimmed) await checkModerationOrThrow(trimmed);

  const imageFilename = image && image.size > 0 ? await saveUploadedImage("feed-post", image) : null;

  const [result] = await db.insert(feedPost).values({
    userId,
    text: trimmed || null,
    image: imageFilename,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  if (trimmed) await notifyHashtaggedReaders(trimmed, userId);

  const settings = await getPointSettings();
  await awardPointsWithDailyCap(userId, settings.feedPost, "feed_post", `feed_post:${result.insertId}`, settings.dailyFeedPostCap);

  return result.insertId;
}

export async function deleteFeedPost(userId: number, postId: number): Promise<void> {
  const [row] = await db.select({ userId: feedPost.userId, image: feedPost.image }).from(feedPost).where(eq(feedPost.id, postId)).limit(1);
  if (!row) throw new Error("Gönderi bulunamadı.");
  if (row.userId !== userId) throw new Error("Bu gönderiyi silme yetkiniz yok.");

  // Same two-level sub_comment cleanup as comments.ts's deleteComment() -
  // without this, replies (and nested replies-to-replies) would dangle,
  // pointing at a parent_id that no longer resolves to anything.
  const level1 = await db.select({ id: subComment.id }).from(subComment).where(and(eq(subComment.parentType, "feedPost"), eq(subComment.parentId, postId)));
  const level1Ids = level1.map((r) => r.id);
  if (level1Ids.length > 0) {
    await db.delete(subComment).where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, level1Ids)));
  }
  await db.delete(subComment).where(and(eq(subComment.parentType, "feedPost"), eq(subComment.parentId, postId)));

  await db.delete(feedPost).where(eq(feedPost.id, postId));
  // Real feed_post rows are gone, but the point_transaction row that made it
  // show up in the feed would otherwise dangle (getSiteFeed already drops
  // items whose target resolves to nothing, same as a deleted comment/book -
  // harmless either way, but removing it here keeps point_transaction from
  // silently accumulating rows for content that no longer exists).
  await db.delete(pointTransaction).where(eq(pointTransaction.reasonKey, `feed_post:${postId}`));
  if (row.image) await deleteUploadedImage("feed-post", row.image);
}

export interface FeedPostLikeState {
  count: number;
  liked: boolean;
}

export async function getFeedPostLikeStates(userId: number | null, postIds: number[]): Promise<Record<number, FeedPostLikeState>> {
  if (postIds.length === 0) return {};

  const [counts, liked] = await Promise.all([
    db.select({ postId: feedPostLike.postId, n: sql<number>`count(*)` }).from(feedPostLike).where(inArray(feedPostLike.postId, postIds)).groupBy(feedPostLike.postId),
    userId
      ? db.select({ postId: feedPostLike.postId }).from(feedPostLike).where(and(eq(feedPostLike.userId, userId), inArray(feedPostLike.postId, postIds)))
      : Promise.resolve([]),
  ]);

  const countMap = new Map(counts.map((r) => [r.postId, r.n]));
  const likedSet = new Set(liked.map((r) => r.postId));

  const result: Record<number, FeedPostLikeState> = {};
  for (const id of postIds) {
    result[id] = { count: Number(countMap.get(id) ?? 0), liked: likedSet.has(id) };
  }
  return result;
}

export async function toggleFeedPostLike(userId: number, postId: number): Promise<{ liked: boolean }> {
  const [existing] = await db.select({ id: feedPostLike.id }).from(feedPostLike).where(and(eq(feedPostLike.userId, userId), eq(feedPostLike.postId, postId))).limit(1);

  if (existing) {
    await db.delete(feedPostLike).where(eq(feedPostLike.id, existing.id));
    return { liked: false };
  }

  await db.insert(feedPostLike).values({ userId, postId });
  return { liked: true };
}

/**
 * Mirrors comments.ts's getRepliesForComments() exactly (same two-level
 * unroll) but rooted at "feedPost" instead of "comment" - kept as a
 * separate function rather than a generalized one to avoid touching the
 * already-working, heavily-used book/writer/translator comment reply path
 * under time pressure.
 */
export async function getRepliesForPosts(postIds: number[]): Promise<Map<number, CommentReply[]>> {
  if (postIds.length === 0) return new Map();

  const level1Rows = await db
    .select({
      id: subComment.id,
      text: subComment.comment,
      authorUsername: user.username,
      authorUserId: user.id,
      parentId: subComment.parentId,
    })
    .from(subComment)
    .innerJoin(user, eq(subComment.userId, user.id))
    .where(and(eq(subComment.parentType, "feedPost"), inArray(subComment.parentId, postIds), eq(user.disable, 0)))
    .orderBy(subComment.id);

  const level1Ids = level1Rows.map((r) => r.id);

  const level2Rows = level1Ids.length
    ? await db
        .select({
          id: subComment.id,
          text: subComment.comment,
          authorUsername: user.username,
          authorUserId: user.id,
          parentId: subComment.parentId,
        })
        .from(subComment)
        .innerJoin(user, eq(subComment.userId, user.id))
        .where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, level1Ids), eq(user.disable, 0)))
        .orderBy(subComment.id)
    : [];

  const level2ByParent = new Map<number, CommentReply[]>();
  for (const row of level2Rows) {
    const list = level2ByParent.get(row.parentId) ?? [];
    list.push({ ...row, parentType: "subComment", replies: [] });
    level2ByParent.set(row.parentId, list);
  }

  const byPost = new Map<number, CommentReply[]>();
  for (const row of level1Rows) {
    const list = byPost.get(row.parentId) ?? [];
    list.push({ ...row, parentType: "feedPost", replies: level2ByParent.get(row.id) ?? [] });
    byPost.set(row.parentId, list);
  }
  return byPost;
}
