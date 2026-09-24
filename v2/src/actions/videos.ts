"use server";

import { auth } from "@/auth";
import { incrementVideoViewCount } from "@/db/queries/videos";
import { addEntityComment, addSubComment, shareEntityComment, type SubCommentParentType, type CommentType } from "@/db/queries/comments";

export async function trackVideoViewAction(videoId: number): Promise<void> {
  await incrementVideoViewCount(videoId).catch(() => {});
}

export async function addVideoCommentAction(
  videoId: number,
  commentType: CommentType,
  text: string,
): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await addEntityComment(Number(session.user.id), videoId, "video", text, commentType);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addVideoReplyAction(
  parentType: SubCommentParentType,
  parentId: number,
  text: string,
): Promise<{ status: boolean; message?: string; replyId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const replyId = await addSubComment(Number(session.user.id), parentType, parentId, text);
    return { status: true, replyId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function shareVideoCommentAction(
  originalCommentId: number,
  commentary: string,
): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "video", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
