"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updatePremiumSettings } from "@/db/queries/premium";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updatePremiumSettingsAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const active = formData.get("active") === "on";
    await updatePremiumSettings({
      active,
      priceKurus: Math.round(Number(formData.get("priceLira") ?? 0) * 100),
      durationDays: Number(formData.get("durationDays") ?? 365),
    });
    await logAdminAction(actor.id, "settings:premium-update", "premium_settings", undefined, `active=${active}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
