"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createCategory, updateCategoryField, deleteCategory, deleteCategories } from "@/db/queries/category-admin";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createCategoryAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    const name = String(formData.get("category") ?? "");
    const nameUs = String(formData.get("categoryUs") ?? "");
    await createCategory(name, nameUs);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Kategori eklenemedi." };
  }
}

export async function updateCategoryFieldAction(categoryId: number, mode: "tr" | "us", value: string): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateCategoryField(categoryId, mode, value);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteCategoryAction(categoryId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteCategory(categoryId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}

export async function deleteCategoriesAction(categoryIds: number[]): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteCategories(categoryIds);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
