"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { unbanEmail } from "@/db/queries/user-delete";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function unbanEmailAction(email: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await unbanEmail(email);
    await logAdminAction(actor.id, "user:unban-email", "banned_email", undefined, email);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Kaldırılamadı." };
  }
}
