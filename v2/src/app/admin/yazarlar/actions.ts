"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import {
  createWriter,
  updateWriterField,
  deleteWriter,
  type WriterUpdateMode,
} from "@/db/queries/writer-admin";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createWriterAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const image = formData.get("image");
    const name = String(formData.get("name") ?? "");
    await createWriter({
      name,
      biyo: String(formData.get("biyo") ?? ""),
      date: String(formData.get("date") ?? ""),
      image: image instanceof File && image.size > 0 ? image : undefined,
    });
    await logAdminAction(actor.id, "writer:create", "writer", undefined, name);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Yazar eklenemedi." };
  }
}

export async function updateWriterFieldAction(
  writerId: number,
  mode: WriterUpdateMode,
  value: string,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateWriterField(writerId, mode, value);
    await logAdminAction(actor.id, "writer:field-update", "writer", writerId, mode);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateWriterImageAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const writerId = Number(formData.get("writerId"));
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("Görsel bulunamadı.");
    await updateWriterField(writerId, "img", image);
    await logAdminAction(actor.id, "writer:image-update", "writer", writerId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Görsel güncellenemedi." };
  }
}

export async function removeWriterImageAction(writerId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateWriterField(writerId, "removeImage", "remove");
    await logAdminAction(actor.id, "writer:image-remove", "writer", writerId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Görsel kaldırılamadı." };
  }
}

export async function deleteWriterAction(writerId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteWriter(writerId);
    await logAdminAction(actor.id, "writer:delete", "writer", writerId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
