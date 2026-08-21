"use server";

import { auth } from "@/auth";
import {
  setReadStatus,
  clearReadStatus,
  type ReadStatus,
  type DropReason,
} from "@/db/queries/reading-status";
import { rateBook } from "@/db/queries/rating";
import {
  addBookComment,
  addSubComment,
  shareEntityComment,
  type SubCommentParentType,
  type CommentType,
} from "@/db/queries/comments";
import { toggleLibrary } from "@/db/queries/library";
import { toggleBookLike } from "@/db/queries/likes";

export interface ActionResult {
  status: boolean;
  message?: string;
}

export async function setReadStatusAction(
  bookId: number,
  status: ReadStatus,
  dropReason?: DropReason,
  dropPercentage?: number,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    await setReadStatus({
      userId: Number(session.user.id),
      bookId,
      status,
      dropReason,
      dropPercentage,
    });
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function clearReadStatusAction(bookId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await clearReadStatus(Number(session.user.id), bookId);
  return { status: true };
}

export async function rateBookAction(
  bookId: number,
  bookSlug: string,
  value: number,
): Promise<ActionResult & { newAverage?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const result = await rateBook(Number(session.user.id), bookId, value, bookSlug);
    return { status: true, newAverage: result.newAverage };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addCommentAction(
  bookId: number,
  commentType: CommentType,
  text: string,
): Promise<ActionResult & { commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const commentId = await addBookComment(Number(session.user.id), bookId, text, commentType);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function shareCommentAction(
  originalCommentId: number,
  commentary: string,
): Promise<ActionResult & { commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "book", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function toggleLibraryAction(
  bookId: number,
): Promise<ActionResult & { inLibrary?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await toggleLibrary(Number(session.user.id), bookId);
  return { status: true, inLibrary: result.inLibrary };
}

export async function addReplyAction(
  parentType: SubCommentParentType,
  parentId: number,
  text: string,
): Promise<ActionResult & { replyId?: number }> {
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

export async function toggleLikeAction(
  bookId: number,
): Promise<ActionResult & { liked?: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await toggleBookLike(Number(session.user.id), bookId);
  return { status: true, liked: result.liked };
}
