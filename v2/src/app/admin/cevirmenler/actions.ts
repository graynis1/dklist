"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import {
  createTranslator,
  updateTranslatorField,
  deleteTranslator,
  type TranslatorUpdateMode,
} from "@/db/queries/translator-admin";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createTranslatorAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const image = formData.get("image");
    await createTranslator({
      name: String(formData.get("name") ?? ""),
      biyo: String(formData.get("biyo") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      deathDate: String(formData.get("deathDate") ?? ""),
      image: image instanceof File && image.size > 0 ? image : undefined,
    });
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Çevirmen eklenemedi." };
  }
}

export async function updateTranslatorFieldAction(
  translatorId: number,
  mode: TranslatorUpdateMode,
  value: string,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateTranslatorField(translatorId, mode, value);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateTranslatorImageAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const translatorId = Number(formData.get("translatorId"));
    const image = formData.get("image");
    if (!(image instanceof File)) throw new Error("Görsel bulunamadı.");
    await updateTranslatorField(translatorId, "img", image);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Görsel güncellenemedi." };
  }
}

export async function deleteTranslatorAction(translatorId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteTranslator(translatorId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
