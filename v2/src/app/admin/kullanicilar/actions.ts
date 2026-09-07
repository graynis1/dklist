"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateUserRole, toggleUserDisabled, updateUserPublisher, updateUserBadges, getUserBadgeIds, suspendUser, liftSuspension } from "@/db/queries/user-admin";
import { deleteUserAccount, banEmail } from "@/db/queries/user-delete";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAdminAction } from "@/db/queries/admin-log";
import { linkUserToWriter } from "@/db/queries/yazarhane";
import { getAllBadgesBrief } from "@/db/queries/badge-admin";
import { getFrameRewardsBrief, setUserFrameAdmin, getUserActiveFrame } from "@/db/queries/point-store";

const ADMIN_ONLY = [USER_TYPES.Admin];
// Was SuperAdmin-only (an empty allow-list, matching v1's original
// deleteUserAdmin() gate) - a real gap found via customer report
// (2026-09-08): there is no actual SuperAdmin account on this data (the
// real top-of-hierarchy account is "Kurucu"), and hasRole()'s Kurucu-
// bypass rule only fires for an allow-list that explicitly includes
// Admin - an empty array never matches it. So this button was reachable
// by nobody in practice. Now gated the same as every other mutating
// action in this panel (role change, disable, suspend, ban-email) -
// still real Admin-tier-or-above only, just not an unreachable tier.

export async function updateUserRoleAction(userId: number, newUserType: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateUserRole(userId, newUserType);
    await logAdminAction(actor.id, "user:role-change", "user", userId, `-> ${newUserType}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function toggleUserDisabledAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await toggleUserDisabled(userId);
    await logAdminAction(actor.id, "user:disable-toggle", "user", userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

/** `days` - how many days from now the suspension should last (validated
 * as a small positive integer, not an arbitrary client-supplied date, so a
 * malformed/past timestamp can never reach suspendUser()'s own check). */
export async function suspendUserAction(userId: number, days: number, reason: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Süre 1 ile 3650 gün arasında olmalıdır.");
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await suspendUser(userId, until, reason.trim() || null);
    await logAdminAction(actor.id, "user:suspend", "user", userId, `${days} gün - ${reason.trim() || "sebep belirtilmedi"}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Askıya alınamadı." };
  }
}

export async function liftSuspensionAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await liftSuspension(userId);
    await logAdminAction(actor.id, "user:suspend-lift", "user", userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Kaldırılamadı." };
  }
}

export async function updateUserPublisherAction(userId: number, publisherId: number | null): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateUserPublisher(userId, publisherId);
    await logAdminAction(actor.id, "user:publisher-link", "user", userId, `publisher=${publisherId ?? "none"}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateUserWriterAction(userId: number, writerId: number | null): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await linkUserToWriter(userId, writerId);
    await logAdminAction(actor.id, "user:writer-link", "user", userId, `writer=${writerId ?? "none"}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

/** Loads everything the badge/frame assignment panel needs in one call,
 * fetched lazily when an admin actually opens it for one row (see
 * getUserBadgeIds()'s own doc comment for why this isn't batched into the
 * list page itself). */
export async function getUserAssignmentPanelDataAction(userId: number): Promise<{
  status: boolean;
  message?: string;
  badges?: { id: number; name: string }[];
  assignedBadgeIds?: number[];
  frames?: { id: number; name: string; rewardValue: string }[];
  activeFrame?: string | null;
}> {
  try {
    await requireRole(ADMIN_ONLY);
    const [allBadges, assignedBadgeIds, frames, activeFrame] = await Promise.all([
      getAllBadgesBrief(),
      getUserBadgeIds(userId),
      getFrameRewardsBrief(),
      getUserActiveFrame(userId),
    ]);
    return { status: true, badges: allBadges, assignedBadgeIds, frames, activeFrame };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Yüklenemedi." };
  }
}

export async function updateUserBadgesAction(userId: number, badgeIds: number[]): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateUserBadges(userId, badgeIds);
    await logAdminAction(actor.id, "user:badges-assign", "user", userId, `badges=[${badgeIds.join(",")}]`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function setUserFrameAdminAction(userId: number, rewardValue: string | null): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await setUserFrameAdmin(userId, rewardValue);
    await logAdminAction(actor.id, "user:frame-assign", "user", userId, rewardValue ?? "none");
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteUserAccountAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteUserAccount(userId);
    await logAdminAction(actor.id, "user:delete-account", "user", userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}

/** Real customer report: "yanlış kişiyi silsen yine aynı hesapla geri
 * geliş mümkün engelleme olmalı maile sanki. Engelleyip sonra silebilir."
 * Bans the account's CURRENT email (works whether the account still
 * exists or was already deleted) - a deliberately separate action from
 * delete, not a checkbox bundled into it. */
export async function banUserEmailAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const [row] = await db.select({ mail: user.mail, username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
    if (!row) return { status: false, message: "Kullanıcı bulunamadı." };
    await banEmail(row.mail, `Admin panelden engellendi: ${row.username}`, actor.id);
    await logAdminAction(actor.id, "user:ban-email", "user", userId, row.mail);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Engellenemedi." };
  }
}
