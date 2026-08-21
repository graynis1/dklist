"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { recordWeeklyWinner, markWinnerFulfilled } from "@/db/queries/points";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function recordWeeklyWinnerAction(
  yearWeek: string,
  userId: number,
  points: number,
  prizeBookId: number | null,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  return recordWeeklyWinner(yearWeek, userId, points, prizeBookId);
}

export async function markWinnerFulfilledAction(id: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await markWinnerFulfilled(id);
  return { status: true };
}
