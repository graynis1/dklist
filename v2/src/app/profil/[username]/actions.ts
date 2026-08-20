"use server";

import { auth } from "@/auth";
import { toggleFollow, setReadingGoal, getCurrentReadingGoal, type ReadingGoal } from "@/db/queries/profile";

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

export async function setReadingGoalAction(
  count: number,
): Promise<{ status: boolean; message?: string; goal?: ReadingGoal }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  try {
    const userId = Number(session.user.id);
    await setReadingGoal(userId, count);
    const goal = await getCurrentReadingGoal(userId);
    return { status: true, goal: goal ?? undefined };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
