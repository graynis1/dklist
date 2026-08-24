"use server";

import { auth } from "@/auth";
import { togglePublisherLike } from "@/db/queries/likes";

export async function togglePublisherLikeAction(
  publisherId: number,
): Promise<{ status: boolean; liked?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await togglePublisherLike(Number(session.user.id), publisherId);
  return { status: true, liked: result.liked };
}
