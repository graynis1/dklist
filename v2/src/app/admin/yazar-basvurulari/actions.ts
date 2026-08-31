"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { approveWriterApplication, rejectWriterApplication } from "@/db/queries/yazarhane";
import { logAdminAction } from "@/db/queries/admin-log";

const REVIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export async function approveWriterApplicationAction(applicationId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(REVIEW_ROLES);
    await approveWriterApplication(applicationId, actor.id);
    await logAdminAction(actor.id, "writer-application:approve", "writer_application", applicationId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function rejectWriterApplicationAction(applicationId: number, reviewerNote: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(REVIEW_ROLES);
    await rejectWriterApplication(applicationId, actor.id, reviewerNote);
    await logAdminAction(actor.id, "writer-application:reject", "writer_application", applicationId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
