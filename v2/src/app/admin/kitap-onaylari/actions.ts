"use server";

import { updateTag } from "next/cache";
import { approveBookSubmission, rejectBookSubmission } from "@/db/queries/book-admin";
import { requireRole, USER_TYPES } from "@/lib/permission";
import { logAdminAction } from "@/db/queries/admin-log";

// Customer's spec: Kütüphaneci ("Mod") can both enter AND approve data;
// Admin/SuperAdmin always can too.
const APPROVE_ROLES = [USER_TYPES.Mod, USER_TYPES.Admin];

export async function approveBookSubmissionAction(
  bookId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(APPROVE_ROLES);
    await approveBookSubmission(bookId);
    await logAdminAction(actor.id, "book:approve-submission", "book", bookId);
    updateTag(`book:${bookId}`);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function rejectBookSubmissionAction(
  bookId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(APPROVE_ROLES);
    await rejectBookSubmission(bookId);
    await logAdminAction(actor.id, "book:reject-submission", "book", bookId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
