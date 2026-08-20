"use server";

import { auth } from "@/auth";
import { toggleFollow } from "@/db/queries/profile";

export async function toggleFollowAction(
  targetUserId: number,
): Promise<{ status: boolean; following?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const result = await toggleFollow(Number(session.user.id), targetUserId);
    return { status: true, following: result.following };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
