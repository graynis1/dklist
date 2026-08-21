"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createPublisher, updatePublisherName, deletePublisher } from "@/db/queries/publisher-admin";
import { logAdminAction } from "@/db/queries/admin-log";

const ADMIN_ONLY = [USER_TYPES.Admin];

export async function createPublisherAction(formData: FormData): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    const name = String(formData.get("name") ?? "");
    await createPublisher(name);
    await logAdminAction(actor.id, "publisher:create", "publisher", undefined, name);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Yayınevi eklenemedi." };
  }
}

export async function updatePublisherNameAction(publisherId: number, newName: string): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await updatePublisherName(publisherId, newName);
    await logAdminAction(actor.id, "publisher:update", "publisher", publisherId, newName);
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Güncellenemedi." };
  }
}

/**
 * Deletes the publisher AND every one of its books (matches v1's real
 * behavior - see deletePublisher()'s own doc comment). The UI requires an
 * explicit client-side confirm() before calling this, since the blast
 * radius here is uniquely large compared to every other admin delete
 * button in this app.
 */
export async function deletePublisherAction(publisherId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const actor = await requireRole(ADMIN_ONLY);
    await deletePublisher(publisherId);
    await logAdminAction(actor.id, "publisher:delete", "publisher", publisherId, "cascades to its books");
    return { status: true };
  } catch (error) {
    return { status: false, message: error instanceof Error ? error.message : "Silinemedi." };
  }
}
