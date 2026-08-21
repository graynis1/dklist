"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import {
  createWriter,
  updateWriterField,
  deleteWriter,
  type WriterUpdateMode,
} from "@/db/queries/writer-admin";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createWriterAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const image = formData.get("image");
    await createWriter({
      name: String(formData.get("name") ?? ""),
      biyo: String(formData.get("biyo") ?? ""),
      date: String(formData.get("date") ?? ""),
      image: image instanceof File && image.size > 0 ? image : undefined,
    });
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
    await requireRole(ADMIN_ONLY);
    await updateWriterField(writerId, mode, value);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateWriterImageAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const writerId = Number(formData.get("writerId"));
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("Görsel bulunamadı.");
    await updateWriterField(writerId, "img", image);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Görsel güncellenemedi." };
  }
}

export async function removeWriterImageAction(writerId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateWriterField(writerId, "removeImage", "remove");
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Görsel kaldırılamadı." };
  }
}

export async function deleteWriterAction(writerId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteWriter(writerId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
