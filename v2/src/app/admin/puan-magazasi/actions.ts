"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createReward, updateReward, toggleRewardActive, deleteReward } from "@/db/queries/point-store";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createRewardAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const name = String(formData.get("name") ?? "");
    await createReward({
      name,
      description: String(formData.get("description") ?? ""),
      pointCost: Number(formData.get("pointCost") ?? 0),
      rewardType: String(formData.get("rewardType") ?? "profile_frame"),
      rewardValue: String(formData.get("rewardValue") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    await logAdminAction(actor.id, "point-reward:create", "point_reward", undefined, name);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Eklenemedi." };
  }
}

export async function updateRewardAction(rewardId: number, formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateReward(rewardId, {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      pointCost: Number(formData.get("pointCost") ?? 0),
      rewardValue: String(formData.get("rewardValue") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    await logAdminAction(actor.id, "point-reward:update", "point_reward", rewardId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function toggleRewardActiveAction(rewardId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await toggleRewardActive(rewardId);
    await logAdminAction(actor.id, "point-reward:toggle-active", "point_reward", rewardId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteRewardAction(rewardId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteReward(rewardId);
    await logAdminAction(actor.id, "point-reward:delete", "point_reward", rewardId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
