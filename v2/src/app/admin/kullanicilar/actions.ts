"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateUserRole, toggleUserDisabled, updateUserPublisher } from "@/db/queries/user-admin";
import { deleteUserAccount } from "@/db/queries/user-delete";

const ADMIN_ONLY = [USER_TYPES.Admin];
// v1's real deleteUserAdmin() passes an EMPTY permission allow-list -
// Permission::checkPermission() gives SuperAdmin an unconditional bypass
// but requires every other role to be explicitly listed, so an empty list
// means only SuperAdmin can ever pass. hasRole(type, []) reproduces that
// exactly (SuperAdmin still short-circuits true; nothing else is in an
// empty array). Kept this restrictive deliberately - full account deletion
// is far more destructive than anything else in this panel.
const SUPERADMIN_ONLY: (typeof USER_TYPES)[keyof typeof USER_TYPES][] = [];

export async function updateUserRoleAction(userId: number, newUserType: string): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateUserRole(userId, newUserType);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function toggleUserDisabledAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await toggleUserDisabled(userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateUserPublisherAction(userId: number, publisherId: number | null): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(ADMIN_ONLY);
    await updateUserPublisher(userId, publisherId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteUserAccountAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole(SUPERADMIN_ONLY);
    await deleteUserAccount(userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
