"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { approveVerification, rejectVerification } from "@/db/queries/identity-verification";

const REVIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export async function approveVerificationAction(requestId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(REVIEW_ROLES);
    await approveVerification(requestId, actor.id);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function rejectVerificationAction(requestId: number, reviewerNote: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(REVIEW_ROLES);
    await rejectVerification(requestId, actor.id, reviewerNote);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
