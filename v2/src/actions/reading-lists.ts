"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createReadingList,
  updateReadingList,
  deleteReadingList,
  addBookToList,
  removeBookFromList,
  getUserLists,
  type CreateListInput,
} from "@/db/queries/reading-lists";

export async function createReadingListAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string; slug?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const input: CreateListInput = {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    isPublic: formData.get("isPublic") === "on",
  };

  try {
    const result = await createReadingList(Number(session.user.id), input);
    revalidatePath("/listelerim");
    return { status: true, slug: result.slug };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateReadingListAction(
  listId: number,
  title: string,
  description: string,
  isPublic: boolean,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await updateReadingList(listId, Number(session.user.id), { title, description, isPublic });
    revalidatePath("/listelerim");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteReadingListAction(listId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await deleteReadingList(listId, Number(session.user.id));
    revalidatePath("/listelerim");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function addBookToListAction(listId: number, bookId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await addBookToList(listId, Number(session.user.id), bookId);
    revalidatePath("/listelerim");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function removeBookFromListAction(listId: number, bookId: number): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  try {
    await removeBookFromList(listId, Number(session.user.id), bookId);
    revalidatePath("/listelerim");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

/** Powers the book page's "listeye ekle" picker - the caller's own lists,
 * or an empty array when signed out (the picker just doesn't render). */
export async function getMyListsAction(): Promise<{ id: number; title: string }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const lists = await getUserLists(Number(session.user.id));
  return lists.map((l) => ({ id: l.id, title: l.title }));
}
