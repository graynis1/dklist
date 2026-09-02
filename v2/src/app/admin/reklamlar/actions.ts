"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createAd, toggleAdActive, deleteAd } from "@/db/queries/advertisements";
import { updateAdSenseSettings, setAdSensePlacementSlot } from "@/db/queries/adsense";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createAdAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const image = formData.get("image");
    const placement = String(formData.get("placement") ?? "");
    const language = String(formData.get("language") ?? "");
    await createAd({
      placement,
      language,
      image: image instanceof File ? image : new File([], ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    await logAdminAction(actor.id, "ad:create", "advertisement", undefined, `${placement}${language ? ` (${language})` : ""}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Eklenemedi." };
  }
}

export async function toggleAdActiveAction(adId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await toggleAdActive(adId);
    await logAdminAction(actor.id, "ad:toggle-active", "advertisement", adId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteAdAction(adId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteAd(adId);
    await logAdminAction(actor.id, "ad:delete", "advertisement", adId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}

export async function updateAdSenseSettingsAction(
  publisherId: string,
  enabled: boolean,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateAdSenseSettings(publisherId, enabled);
    await logAdminAction(actor.id, "adsense:settings-update", "adsense", undefined, enabled ? "enabled" : "disabled");
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function setAdSensePlacementSlotAction(
  placement: string,
  slotId: string,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await setAdSensePlacementSlot(placement, slotId);
    await logAdminAction(actor.id, "adsense:slot-update", "adsense", undefined, `${placement}=${slotId}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
