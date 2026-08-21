"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createAd, toggleAdActive, deleteAd } from "@/db/queries/advertisements";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createAdAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const image = formData.get("image");
    await createAd({
      placement: String(formData.get("placement") ?? ""),
      image: image instanceof File ? image : new File([], ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    });
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Eklenemedi." };
  }
}

export async function toggleAdActiveAction(adId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await toggleAdActive(adId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteAdAction(adId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteAd(adId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
