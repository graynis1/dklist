"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateUserRole, toggleUserDisabled, updateUserPublisher } from "@/db/queries/user-admin";
import { deleteUserAccount } from "@/db/queries/user-delete";
import { logAdminAction } from "@/db/queries/admin-log";
import { linkUserToWriter } from "@/db/queries/yazarhane";

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
    const actor = await requireRole(ADMIN_ONLY);
    await updateUserRole(userId, newUserType);
    await logAdminAction(actor.id, "user:role-change", "user", userId, `-> ${newUserType}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function toggleUserDisabledAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await toggleUserDisabled(userId);
    await logAdminAction(actor.id, "user:disable-toggle", "user", userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateUserPublisherAction(userId: number, publisherId: number | null): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updateUserPublisher(userId, publisherId);
    await logAdminAction(actor.id, "user:publisher-link", "user", userId, `publisher=${publisherId ?? "none"}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function updateUserWriterAction(userId: number, writerId: number | null): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await linkUserToWriter(userId, writerId);
    await logAdminAction(actor.id, "user:writer-link", "user", userId, `writer=${writerId ?? "none"}`);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

export async function deleteUserAccountAction(userId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(SUPERADMIN_ONLY);
    await deleteUserAccount(userId);
    await logAdminAction(actor.id, "user:delete-account", "user", userId);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
