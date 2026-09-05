"use server";

import { auth } from "@/auth";
import { rateUser } from "@/db/queries/rating";
import {
  addEntityComment,
  addSubComment,
  shareEntityComment,
  type SubCommentParentType,
  type CommentType,
} from "@/db/queries/comments";

/**
 * Real customer report (Askıda Kitap section, 2026-09-05): "satıcı için
 * satıcı puanı ve yorum kısmı olabilmeli... Trendyol ve diğerlerindeki
 * gibi." Seller reputation is per-PERSON, not per-listing - a review left
 * here targets the seller's user id, shared across every listing they
 * post, same as rating a writer/translator targets that entity everywhere
 * it's shown.
 */
export async function rateSellerAction(sellerId: number, value: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await rateUser(Number(session.user.id), sellerId, value);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addSellerReviewAction(sellerId: number, commentType: CommentType, text: string): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await addEntityComment(Number(session.user.id), sellerId, "user", text, commentType);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addSellerReviewReplyAction(parentType: SubCommentParentType, parentId: number, text: string): Promise<{ status: boolean; message?: string; replyId?: number }> {
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

export async function shareSellerReviewAction(originalCommentId: number, commentary: string): Promise<{ status: boolean; message?: string; commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "user", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
