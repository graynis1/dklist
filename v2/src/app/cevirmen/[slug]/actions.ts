"use server";

import { auth } from "@/auth";
import { toggleTranslatorLike } from "@/db/queries/likes";

export async function toggleTranslatorLikeAction(
  translatorId: number,
): Promise<{ status: boolean; liked?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await toggleTranslatorLike(Number(session.user.id), translatorId);
  return { status: true, liked: result.liked };
}
