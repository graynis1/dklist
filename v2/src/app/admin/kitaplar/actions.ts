"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateBookAdminField, deleteBookAdmin, type BookAdminUpdateMode } from "@/db/queries/book-admin";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function updateBookAdminFieldAction(
  bookId: number,
  mode: BookAdminUpdateMode,
  value: string | number[],
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateBookAdminField(bookId, mode, value);
    await logAdminAction(actor.id, "book:field-update", "book", bookId, mode);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteBookAdminAction(bookId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteBookAdmin(bookId);
    await logAdminAction(actor.id, "book:delete", "book", bookId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
