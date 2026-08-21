"use server";

import { auth } from "@/auth";
import { toggleWriterLike } from "@/db/queries/likes";
import { rateWriter } from "@/db/queries/rating";
import {
  addEntityComment,
  addSubComment,
  shareEntityComment,
  type SubCommentParentType,
  type CommentType,
} from "@/db/queries/comments";

export async function toggleWriterLikeAction(
  writerId: number,
): Promise<{ status: boolean; liked?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await toggleWriterLike(Number(session.user.id), writerId);
  return { status: true, liked: result.liked };
}

export async function rateWriterAction(
  writerId: number,
  writerSlug: string,
  value: number,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    await rateWriter(Number(session.user.id), writerId, value, writerSlug);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addWriterCommentAction(
  writerId: number,
  commentType: CommentType,
  text: string,
): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const commentId = await addEntityComment(
      Number(session.user.id),
      writerId,
      "writer",
      text,
      commentType,
    );
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function shareWriterCommentAction(
  originalCommentId: number,
  commentary: string,
): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "writer", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addWriterReplyAction(
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
