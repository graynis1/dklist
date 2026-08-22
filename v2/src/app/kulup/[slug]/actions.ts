"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addEntityComment,
  addSubComment,
  shareEntityComment,
  type SubCommentParentType,
  type CommentType,
} from "@/db/queries/comments";
import {
  joinClub,
  leaveClub,
  updateClubCurrentBook,
  updateClubDescription,
  deleteClub,
} from "@/db/queries/book-clubs";
import { getBookList } from "@/db/queries/books";

export interface ActionResult {
  status: boolean;
  message?: string;
}

export interface SearchOption {
  id: number;
  label: string;
}

export async function searchBooksForClubAction(query: string): Promise<SearchOption[]> {
  if (query.trim().length < 2) return [];
  const { items } = await getBookList(1, 8, query);
  return items.map((b) => ({ id: b.id, label: b.writers.length > 0 ? `${b.name} — ${b.writers.join(", ")}` : b.name }));
}

export async function addCommentAction(
  clubId: number,
  commentType: CommentType,
  text: string,
): Promise<ActionResult & { commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await addEntityComment(Number(session.user.id), clubId, "bookClub", text, commentType);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
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

export async function shareCommentAction(
  originalCommentId: number,
  commentary: string,
): Promise<ActionResult & { commentId?: number }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    const commentId = await shareEntityComment(Number(session.user.id), originalCommentId, "bookClub", commentary);
    return { status: true, commentId };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function joinClubAction(clubId: number, slug: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await joinClub(clubId, Number(session.user.id));
    revalidatePath(`/kulup/${slug}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function leaveClubAction(clubId: number, slug: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await leaveClub(clubId, Number(session.user.id));
    revalidatePath(`/kulup/${slug}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateClubCurrentBookAction(clubId: number, slug: string, bookId: number | null): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await updateClubCurrentBook(clubId, bookId, Number(session.user.id), session.user.userType ?? "");
    revalidatePath(`/kulup/${slug}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateClubDescriptionAction(clubId: number, slug: string, description: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await updateClubDescription(clubId, description, Number(session.user.id), session.user.userType ?? "");
    revalidatePath(`/kulup/${slug}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteClubAction(clubId: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  try {
    await deleteClub(clubId, Number(session.user.id), session.user.userType ?? "");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
