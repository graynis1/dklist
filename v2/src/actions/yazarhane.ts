"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { createAuthorPost, deleteAuthorPost } from "@/db/queries/yazarhane";

export async function createAuthorPostAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");

  try {
    await createAuthorPost(Number(session.user.id), title, content);
    revalidatePath(`/yazarhane/${session.user.name ?? ""}`);
    revalidatePath("/yazarhane");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteAuthorPostAction(
  postId: number,
  username: string,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { status: false, message: "Giriş yapmalısınız." };

  const isAdmin = hasRole(session.user.userType, [USER_TYPES.Admin]);
  try {
    await deleteAuthorPost(postId, Number(session.user.id), isAdmin);
    revalidatePath(`/yazarhane/${username}`);
    revalidatePath("/yazarhane");
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
