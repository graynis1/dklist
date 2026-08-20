"use server";

import { auth } from "@/auth";
import { toggleWriterLike } from "@/db/queries/likes";

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
