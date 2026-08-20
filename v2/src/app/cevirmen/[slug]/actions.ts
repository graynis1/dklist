"use server";

import { auth } from "@/auth";
import { toggleTranslatorLike } from "@/db/queries/likes";
import { rateTranslator } from "@/db/queries/rating";

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

export async function rateTranslatorAction(
  translatorId: number,
  translatorSlug: string,
  value: number,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    await rateTranslator(Number(session.user.id), translatorId, value, translatorSlug);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
