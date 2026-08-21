"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateSitePopup } from "@/db/queries/site-popup";

const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export async function updateSitePopupAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ALLOWED);
    const image = formData.get("image");
    await updateSitePopup({
      active: formData.get("active") === "on",
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      link: String(formData.get("link") ?? ""),
      image: image instanceof File && image.size > 0 ? image : undefined,
    });
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
