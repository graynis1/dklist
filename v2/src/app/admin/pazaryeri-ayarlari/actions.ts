"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateMarketplaceSettings } from "@/db/queries/marketplace-settings";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updateMarketplaceSettingsAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const active = formData.get("active") === "on";
    const commissionRate = Number(formData.get("commissionRate") ?? 5);
    const iyzicoApiKey = String(formData.get("iyzicoApiKey") ?? "").trim();
    const iyzicoSecretKey = String(formData.get("iyzicoSecretKey") ?? "").trim();
    const iyzicoBaseUrl = String(formData.get("iyzicoBaseUrl") ?? "").trim();

    await updateMarketplaceSettings({
      active,
      commissionRate,
      // Empty inputs mean "keep the existing key" - the admin form never
      // pre-fills the real secret back into the input (masked/blank on
      // load), so a blank submit must not silently wipe a working key.
      iyzicoApiKey: iyzicoApiKey ? iyzicoApiKey : undefined,
      iyzicoSecretKey: iyzicoSecretKey ? iyzicoSecretKey : undefined,
      iyzicoBaseUrl: iyzicoBaseUrl || undefined,
    });
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
