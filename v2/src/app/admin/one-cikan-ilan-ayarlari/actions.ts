"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateStorePinSettings } from "@/db/queries/store-pin";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updateStorePinSettingsAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const active = formData.get("active") === "on";
    await updateStorePinSettings({
      active,
      priceKurus: Math.round(Number(formData.get("priceLira") ?? 0) * 100),
      durationDays: Number(formData.get("durationDays") ?? 7),
    });
    await logAdminAction(actor.id, "settings:store-pin-update", "store_pin_settings", undefined, `active=${active}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
