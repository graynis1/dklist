"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { auth } from "@/auth";
import { recordWeeklyWinner, markWinnerFulfilled, awardSharePoints } from "@/db/queries/points";

const ADMIN_ONLY = [USER_TYPES.Admin];

/** Called from ShareButton's click handlers - silently a no-op when
 * signed out (sharing itself never requires login, only the points do).
 * `entityKey` just needs to be stable per shared thing (e.g. "book:123"),
 * awardSharePoints() itself caps it to once per user per entity per day. */
export async function awardSharePointsAction(entityKey: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await awardSharePoints(Number(session.user.id), entityKey);
}

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
