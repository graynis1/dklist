"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { setBookOfMonth } from "@/db/queries/book-of-month";
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
