import "server-only";
import { asc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { pointReward, pointRedemption, user } from "@/db/schema";
import { getUserTotalPoints, awardPoints } from "@/db/queries/points";
import { isDuplicateKeyError } from "@/lib/db-errors";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export interface PointRewardItem {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  rewardType: string;
  rewardValue: string;
  active: boolean;
  sortOrder: number;
}

export async function getActiveRewards(): Promise<PointRewardItem[]> {
  const rows = await db.select().from(pointReward).where(eq(pointReward.active, 1)).orderBy(asc(pointReward.sortOrder), asc(pointReward.pointCost));
  return rows.map((r) => ({ ...r, active: r.active === 1 }));
}

export async function getRewardAdminList(): Promise<PointRewardItem[]> {
  const rows = await db.select().from(pointReward).orderBy(asc(pointReward.sortOrder), asc(pointReward.pointCost));
  return rows.map((r) => ({ ...r, active: r.active === 1 }));
}

export async function getUserRedeemedRewardIds(userId: number): Promise<number[]> {
  const rows = await db.select({ rewardId: pointRedemption.rewardId }).from(pointRedemption).where(eq(pointRedemption.userId, userId));
  return rows.map((r) => r.rewardId);
}

export async function getUserActiveFrame(userId: number): Promise<string | null> {
  const [row] = await db.select({ profileFrame: user.profileFrame }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.profileFrame ?? null;
}

/**
 * Redeems a reward - "spends" points by inserting a NEGATIVE
 * point_transaction row (reasonKey unique per user+reward, so this is
 * naturally idempotent the same way every other awardPoints() call site
 * is: retrying a redemption after a failed follow-up step never double-
 * spends). getUserTotalPoints() already sums the whole ledger, so a
 * negative row is all that's needed - no separate balance column to keep
 * in sync. Only `profile_frame` reward type is implemented for real effect
 * right now; other reward types could be added later without touching
 * this redemption/ledger mechanism.
 */
export async function redeemReward(userId: number, rewardId: number): Promise<{ status: boolean; message?: string }> {
  const [reward] = await db.select().from(pointReward).where(and(eq(pointReward.id, rewardId), eq(pointReward.active, 1))).limit(1);
  if (!reward) return { status: false, message: "Ödül bulunamadı." };

  const [already] = await db.select({ id: pointRedemption.id }).from(pointRedemption).where(and(eq(pointRedemption.userId, userId), eq(pointRedemption.rewardId, rewardId))).limit(1);
  if (already) return { status: false, message: "Bu ödülü zaten aldınız." };

  const total = await getUserTotalPoints(userId);
  if (total < reward.pointCost) return { status: false, message: "Yeterli puanınız yok." };

  try {
    await db.insert(pointRedemption).values({ userId, rewardId, redeemedAt: nowSql() });
  } catch (err) {
    if (isDuplicateKeyError(err, "uniq_point_redemption_user_reward")) {
      return { status: false, message: "Bu ödülü zaten aldınız." };
    }
    throw err;
  }

  await awardPoints(userId, -reward.pointCost, "point_store_redeem", `point_store_redeem:${userId}:${rewardId}`);

  if (reward.rewardType === "profile_frame") {
    await db.update(user).set({ profileFrame: reward.rewardValue }).where(eq(user.id, userId));
  }

  return { status: true };
}

/** Lets a user switch their equipped frame among frames they've already
 * redeemed (or unequip with null) - separate from redeemReward() since
 * owning multiple frames but wearing only one is a real, expected case. */
export async function setActiveProfileFrame(userId: number, rewardValue: string | null): Promise<void> {
  if (rewardValue !== null) {
    const owned = await db
      .select({ id: pointRedemption.id })
      .from(pointRedemption)
      .innerJoin(pointReward, eq(pointRedemption.rewardId, pointReward.id))
      .where(and(eq(pointRedemption.userId, userId), eq(pointReward.rewardValue, rewardValue), eq(pointReward.rewardType, "profile_frame")))
      .limit(1);
    if (owned.length === 0) throw new Error("Bu çerçeveye sahip değilsiniz.");
  }
  await db.update(user).set({ profileFrame: rewardValue }).where(eq(user.id, userId));
}

/** Unpaginated brief list of the frame-type rewards, for the user-admin
 * panel's "force-assign a frame" picker - same small-admin-curated-set
 * reasoning as getAllBadgesBrief(). */
export async function getFrameRewardsBrief(): Promise<{ id: number; name: string; rewardValue: string }[]> {
  return db
    .select({ id: pointReward.id, name: pointReward.name, rewardValue: pointReward.rewardValue })
    .from(pointReward)
    .where(eq(pointReward.rewardType, "profile_frame"))
    .orderBy(asc(pointReward.sortOrder));
}

/** Admin override - directly sets a user's equipped frame regardless of
 * whether they've ever redeemed it (no points check, no ownership check).
 * Deliberately does NOT insert a point_redemption row - this is a manual
 * grant, not the user "buying" it, so it doesn't fabricate a ledger entry
 * that never happened. Pass null to unequip. */
export async function setUserFrameAdmin(userId: number, rewardValue: string | null): Promise<void> {
  await db.update(user).set({ profileFrame: rewardValue }).where(eq(user.id, userId));
}

export interface CreateRewardInput {
  name: string;
  description?: string;
  pointCost: number;
  rewardType: string;
  rewardValue: string;
  sortOrder?: number;
}

export async function createReward(input: CreateRewardInput): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Ad zorunludur.");
  if (!Number.isInteger(input.pointCost) || input.pointCost <= 0) throw new Error("Puan bedeli pozitif bir tam sayı olmalıdır.");
  const rewardValue = input.rewardValue.trim();
  if (!rewardValue) throw new Error("Ödül değeri zorunludur.");

  await db.insert(pointReward).values({
    name,
    description: input.description?.trim() || null,
    pointCost: input.pointCost,
    rewardType: input.rewardType,
    rewardValue,
    active: 1,
    sortOrder: input.sortOrder ?? 0,
    createdDate: nowSql(),
  });
}

export async function toggleRewardActive(rewardId: number): Promise<void> {
  const [row] = await db.select({ active: pointReward.active }).from(pointReward).where(eq(pointReward.id, rewardId)).limit(1);
  if (!row) throw new Error("Ödül bulunamadı.");
  await db.update(pointReward).set({ active: row.active === 1 ? 0 : 1 }).where(eq(pointReward.id, rewardId));
}

export async function deleteReward(rewardId: number): Promise<void> {
  await db.delete(pointRedemption).where(eq(pointRedemption.rewardId, rewardId));
  await db.delete(pointReward).where(eq(pointReward.id, rewardId));
}
