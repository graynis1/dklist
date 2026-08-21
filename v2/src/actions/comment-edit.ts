"use server";

import { auth } from "@/auth";
import { updateComment, deleteComment, updateSubComment, deleteSubComment } from "@/db/queries/comments";

// Shared across book/writer/translator pages, like toggleCommentLikeAction -
// editing/deleting your own comment isn't scoped to any one entity type.

export async function updateCommentAction(commentId: number, text: string): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  try {
    await updateComment(Number(session.user.id), commentId, text);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteCommentAction(commentId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  try {
    await deleteComment(Number(session.user.id), commentId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateSubCommentAction(subCommentId: number, text: string): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  try {
    await updateSubComment(Number(session.user.id), subCommentId, text);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteSubCommentAction(subCommentId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };
  try {
    await deleteSubComment(Number(session.user.id), subCommentId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
