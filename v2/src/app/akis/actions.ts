"use server";

import { auth } from "@/auth";
import { getSiteFeed, type FeedPage } from "@/db/queries/feed";
import { createFeedPost, deleteFeedPost, setFeedPostReaction } from "@/db/queries/feed-posts";
import { addSubComment, type SubCommentParentType, type CommentReply } from "@/db/queries/comments";

export async function loadMoreFeedAction(
  cursor: number,
  followingOnly: boolean,
  mode: "posts" | "activity" = "posts",
): Promise<FeedPage> {
  // Always resolved (not just for followingOnly) - getSiteFeed also needs
  // viewerId to report each comment/quote's real like state for the signed-
  // in viewer, regardless of which tab they're on.
  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  return getSiteFeed({ cursor, followingOnly, viewerId, mode });
}

interface ActionResult {
  status: boolean;
  message?: string;
}

export async function createFeedPostAction(formData: FormData): Promise<ActionResult & { postId?: number }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    const text = String(formData.get("text") ?? "");
    const image = formData.get("image");
    const bookIdRaw = String(formData.get("bookId") ?? "").split(",")[0];
    const bookId = bookIdRaw ? Number(bookIdRaw) : null;
    const postId = await createFeedPost(Number(session.user.id), text, image instanceof File ? image : null, bookId);
    return { status: true, postId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteFeedPostAction(postId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await deleteFeedPost(Number(session.user.id), postId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setFeedPostReactionAction(
  postId: number,
  value: 1 | -1,
): Promise<ActionResult & { reaction?: 1 | -1 | null }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const result = await setFeedPostReaction(Number(session.user.id), postId, value);
  return { status: true, reaction: result.reaction };
}

/**
 * Generic reply action for the feed - covers both "comment" (a book/writer/
 * translator review/quote) and "feedPost" (a standalone status update) roots,
 * unlike the book-page-bound addReplyAction in kitap/[slug]/actions.ts.
 * addSubComment() itself was already fully generic (no page-specific state),
 * so this is a thin auth-checked wrapper, not new business logic.
 */
export async function addFeedReplyAction(
  parentType: SubCommentParentType,
  parentId: number,
  text: string,
): Promise<ActionResult & { reply?: CommentReply }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    const userId = Number(session.user.id);
    const replyId = await addSubComment(userId, parentType, parentId, text);
    return {
      status: true,
      reply: {
        id: replyId,
        text: text.trim(),
        authorUsername: session.user.name ?? "?",
        authorUserId: userId,
        authorImage: session.user.image ?? null,
        parentType,
        parentId,
        replies: [],
      },
    };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
