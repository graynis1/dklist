"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { setBookOfMonth, deleteBookOfMonth } from "@/db/queries/book-of-month";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function setBookOfMonthAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const bookId = Number(String(formData.get("bookId") ?? "").split(",")[0]);
    const periodLabel = String(formData.get("periodLabel") ?? "");
    await setBookOfMonth(bookId, periodLabel);
    await logAdminAction(actor.id, "book-of-month:set", "book", bookId, periodLabel);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Ayarlanamadı." };
  }
}

/** Real customer report: "Ekim girdim şu an sileyim eskisi geri gelsin
 * eylül yazan gibi düşündüm" - a wrongly-entered period had no way to
 * be removed at all. */
export async function deleteBookOfMonthAction(id: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deleteBookOfMonth(id);
    await logAdminAction(actor.id, "book-of-month:delete", "book_of_month", id);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
