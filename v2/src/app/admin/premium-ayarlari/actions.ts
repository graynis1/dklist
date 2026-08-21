"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updatePremiumSettings } from "@/db/queries/premium";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updatePremiumSettingsAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updatePremiumSettings({
      active: formData.get("active") === "on",
      priceKurus: Math.round(Number(formData.get("priceLira") ?? 0) * 100),
      durationDays: Number(formData.get("durationDays") ?? 365),
    });
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
