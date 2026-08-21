"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateBookAdminField, deleteBookAdmin, type BookAdminUpdateMode } from "@/db/queries/book-admin";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updateBookAdminFieldAction(
  bookId: number,
  mode: BookAdminUpdateMode,
  value: string | number[],
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateBookAdminField(bookId, mode, value);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteBookAdminAction(bookId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await deleteBookAdmin(bookId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
