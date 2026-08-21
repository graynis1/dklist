"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { updateUserRole, toggleUserDisabled, updateUserPublisher } from "@/db/queries/user-admin";

const ADMIN_ONLY = [USER_TYPES.Admin];

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
