import "server-only";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { feedPost, subComment, user } from "@/db/schema";
import { checkModerationOrThrow, type CommentReply } from "@/db/queries/comments";
import { getFeedPostLikeStates, getRepliesForPosts, type FeedPostLikeState } from "@/db/queries/feed-posts";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import type { FrameTier } from "@/lib/profile-frame-tier";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/image-upload";
import { canManageClub, isClubMember } from "@/db/queries/book-clubs";

/**
 * In-club posts (customer: "Kulüp içinde web ve uygulamada etkileşim için
 * sadece düz yazı dışında resim vb ana sayfadaki gibi paylaşılabilir...
 * beğeni... alt yorum"). Stored as feed_post rows with club_id set, so they
 * get the feed's text+image, likes (feed_post_like) and two-level replies
 * (sub_comment parentType "feedPost") for free. Unlike public feed posts
 * they are never written to point_transaction as "feed_post", which is
 * what keeps them out of the site-wide Akış.
 */

export interface ClubPost {
  id: number;
  text: string | null;
  image: string | null;
  createdAt: string;
  authorUserId: number;
  authorUsername: string;
  authorImage: string | null;
  profileFrame: string | null;
  frameTier: FrameTier;
  likeState: FeedPostLikeState;
  replies: CommentReply[];
}

export async function getClubPosts(clubId: number, viewerId: number | null, limit = 20, beforeId?: number): Promise<{ items: ClubPost[]; nextCursor: number | null }> {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const rows = await db
    .select({
      id: feedPost.id,
      text: feedPost.text,
      image: feedPost.image,
      createdAt: feedPost.createdAt,
      authorUserId: user.id,
      authorUsername: user.username,
      authorImage: user.image,
    })
    .from(feedPost)
    .innerJoin(user, eq(feedPost.userId, user.id))
    .where(and(eq(feedPost.clubId, clubId), eq(user.disable, 0), beforeId ? lt(feedPost.id, beforeId) : undefined))
    .orderBy(desc(feedPost.id))
    .limit(safeLimit + 1);

  const page = rows.slice(0, safeLimit);
  const ids = page.map((r) => r.id);
  const [likes, replies, decorations] = await Promise.all([
    getFeedPostLikeStates(viewerId, ids),
    getRepliesForPosts(ids),
    getUserDecorations(page.map((r) => r.authorUserId)),
  ]);

  return {
    items: page.map((r) => {
      const deco = decorationFor(decorations, r.authorUserId);
      return {
        ...r,
        profileFrame: deco.profileFrame,
        frameTier: deco.frameTier,
        likeState: likes[r.id] ?? { count: 0, liked: false, dislikeCount: 0, disliked: false },
        replies: replies.get(r.id) ?? [],
      };
    }),
    nextCursor: rows.length > safeLimit ? page[page.length - 1].id : null,
  };
}

export async function createClubPost(clubId: number, userId: number, text: string, image: File | null): Promise<number> {
  if (!(await isClubMember(clubId, userId))) throw new Error("Paylaşım yapmak için kulübe üye olmalısın.");
  const trimmed = text.trim();
  if (!trimmed && (!image || image.size === 0)) throw new Error("Bir metin yazın veya bir görsel ekleyin.");
  if (trimmed.length > 2000) throw new Error("Gönderi en fazla 2000 karakter olabilir.");
  if (trimmed) await checkModerationOrThrow(trimmed);

  const imageFilename = image && image.size > 0 ? await saveUploadedImage("feed-post", image) : null;
  const [result] = await db.insert(feedPost).values({
    userId,
    clubId,
    text: trimmed || null,
    image: imageFilename,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });
  return result.insertId;
}

/** The author, or anyone who can manage the club (owner, club admins, site Admin/Mod). */
export async function deleteClubPost(clubId: number, postId: number, actorUserId: number, actorUserType: string): Promise<void> {
  const [row] = await db.select({ userId: feedPost.userId, image: feedPost.image, clubId: feedPost.clubId }).from(feedPost).where(eq(feedPost.id, postId)).limit(1);
  if (!row || row.clubId !== clubId) throw new Error("Gönderi bulunamadı.");
  if (row.userId !== actorUserId && !(await canManageClub(clubId, actorUserId, actorUserType))) {
    throw new Error("Bu gönderiyi silme yetkiniz yok.");
  }

  const level1 = await db.select({ id: subComment.id }).from(subComment).where(and(eq(subComment.parentType, "feedPost"), eq(subComment.parentId, postId)));
  const level1Ids = level1.map((r) => r.id);
  if (level1Ids.length > 0) {
    await db.delete(subComment).where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, level1Ids)));
  }
  await db.delete(subComment).where(and(eq(subComment.parentType, "feedPost"), eq(subComment.parentId, postId)));
  await db.delete(feedPost).where(eq(feedPost.id, postId));
  if (row.image) await deleteUploadedImage("feed-post", row.image);
}
