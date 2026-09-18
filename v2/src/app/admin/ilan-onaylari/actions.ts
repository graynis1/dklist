"use server";

import { approveStoreListing, rejectStoreListing } from "@/db/queries/store";
import { requireRole, USER_TYPES } from "@/lib/permission";
import { logAdminAction } from "@/db/queries/admin-log";

const APPROVE_ROLES = [USER_TYPES.Mod, USER_TYPES.Admin];

export async function approveStoreListingAction(
  storeId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(APPROVE_ROLES);
    await approveStoreListing(storeId);
    await logAdminAction(actor.id, "store:approve-listing", "store", storeId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function rejectStoreListingAction(
  storeId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(APPROVE_ROLES);
    await rejectStoreListing(storeId);
    await logAdminAction(actor.id, "store:reject-listing", "store", storeId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
