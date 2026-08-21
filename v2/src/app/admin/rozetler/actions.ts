"use server";

import { updateTag } from "next/cache";
import {
  createBadge,
  updateBadgeField,
  deleteBadge,
  deleteBadges,
  type BadgeUpdateMode,
} from "@/db/queries/badge-admin";
import { requireRole, USER_TYPES } from "@/lib/permission";

export async function createBadgeAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin]);
    const image = formData.get("image");
    await createBadge({
      name: String(formData.get("name") ?? ""),
      comment: String(formData.get("comment") ?? ""),
      nameUs: String(formData.get("nameUs") ?? ""),
      commentUs: String(formData.get("commentUs") ?? ""),
      image: image instanceof File ? image : new File([], ""),
    });
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateBadgeFieldAction(
  badgeId: number,
  mode: BadgeUpdateMode,
  value: string,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin]);
    await updateBadgeField(badgeId, mode, value);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateBadgeImageAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin]);
    const badgeId = Number(formData.get("badgeId") ?? 0);
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("Görsel gönderilmedi.");
    await updateBadgeField(badgeId, "img", image);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteBadgeAction(
  badgeId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin]);
    await deleteBadge(badgeId);
    updateTag(`user-badges`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteBadgesAction(
  badgeIds: number[],
): Promise<{ status: boolean; message?: string; success?: number; fail?: number }> {
  try {
    await requireRole([USER_TYPES.Admin]);
    const result = await deleteBadges(badgeIds);
    return { status: true, ...result };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
