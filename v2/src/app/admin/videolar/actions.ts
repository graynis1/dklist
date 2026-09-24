"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createVideo, updateVideo, deleteVideo } from "@/db/queries/videos";
import { logAdminAction } from "@/db/queries/admin-log";

// Admin-only end to end, matching v1's real YoutubeController (its own
// getAll() let Mod view too, but every write action there was Admin-only -
// there's no "Mod can see a queue but not act on it" split worth
// reproducing here since there's no queue at all, just direct writes).
const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createVideoAction(formData: FormData): Promise<{ status: boolean; message?: string; slug?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const title = String(formData.get("title") ?? "");
    const link = String(formData.get("link") ?? "");
    const result = await createVideo(title, link);
    if (result.status) {
      await logAdminAction(actor.id, "video:create", "video", result.slug, title);
    }
    return result;
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Video eklenemedi." };
  }
}

export async function updateVideoFieldAction(
  videoId: number,
  mode: "title" | "link",
  value: string,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const result = await updateVideo(videoId, mode === "title" ? { title: value } : { youtubeUrlOrId: value });
    if (result.status) {
      await logAdminAction(actor.id, "video:field-update", "video", videoId, mode);
    }
    return result;
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteVideoAction(videoId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const result = await deleteVideo(videoId);
    if (result.status) {
      await logAdminAction(actor.id, "video:delete", "video", videoId);
    }
    return result;
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
