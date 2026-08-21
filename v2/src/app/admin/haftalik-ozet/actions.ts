"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { sendWeeklyDigestsNow } from "@/db/queries/weekly-digest";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function sendWeeklyDigestsNowAction(): Promise<{ status: boolean; message?: string; sent?: number; skipped?: number }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const result = await sendWeeklyDigestsNow();
    if (!result.mailConfigured) {
      return { status: false, message: "E-posta gönderimi yapılandırılmamış (.env.local'de SMTP ayarları yok)." };
    }
    await logAdminAction(actor.id, "weekly-digest:send-now", undefined, undefined, `sent=${result.sent}, skipped=${result.skipped}`);
    return { status: true, sent: result.sent, skipped: result.skipped };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Gönderilemedi." };
  }
}
