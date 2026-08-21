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
import { logAdminAction } from "@/db/queries/admin-log";

export async function createBadgeAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole([USER_TYPES.Admin]);
    const image = formData.get("image");
    const name = String(formData.get("name") ?? "");
    await createBadge({
      name,
      comment: String(formData.get("comment") ?? ""),
      nameUs: String(formData.get("nameUs") ?? ""),
      commentUs: String(formData.get("commentUs") ?? ""),
      image: image instanceof File ? image : new File([], ""),
    });
    await logAdminAction(actor.id, "badge:create", "badge", undefined, name);
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
    const actor = await requireRole([USER_TYPES.Admin]);
    await updateBadgeField(badgeId, mode, value);
    await logAdminAction(actor.id, "badge:field-update", "badge", badgeId, mode);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function updateBadgeImageAction(
  formData: FormData,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole([USER_TYPES.Admin]);
    const badgeId = Number(formData.get("badgeId") ?? 0);
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("Görsel gönderilmedi.");
    await updateBadgeField(badgeId, "img", image);
    await logAdminAction(actor.id, "badge:image-update", "badge", badgeId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteBadgeAction(
  badgeId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole([USER_TYPES.Admin]);
    await deleteBadge(badgeId);
    await logAdminAction(actor.id, "badge:delete", "badge", badgeId);
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
    const actor = await requireRole([USER_TYPES.Admin]);
    const result = await deleteBadges(badgeIds);
    await logAdminAction(actor.id, "badge:bulk-delete", "badge", undefined, badgeIds.join(","));
    return { status: true, ...result };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
