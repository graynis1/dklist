"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updatePointSetting, type PointSettingKey } from "@/db/queries/points";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updatePointSettingAction(key: PointSettingKey, points: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updatePointSetting(key, points);
    await logAdminAction(actor.id, "settings:point-setting-update", "point_setting", key, `${points}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
