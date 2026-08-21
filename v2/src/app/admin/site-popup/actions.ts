"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateSitePopup } from "@/db/queries/site-popup";
import { logAdminAction } from "@/db/queries/admin-log";

const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export async function updateSitePopupAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ALLOWED);
    const image = formData.get("image");
    const active = formData.get("active") === "on";
    await updateSitePopup({
      active,
      title: String(formData.get("title") ?? ""),
      content: String(formData.get("content") ?? ""),
      link: String(formData.get("link") ?? ""),
      image: image instanceof File && image.size > 0 ? image : undefined,
    });
    await logAdminAction(actor.id, "settings:site-popup-update", "site_popup", undefined, `active=${active}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}
