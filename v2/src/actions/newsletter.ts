"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import {
  subscribeToNewsletter,
  deleteNewsletterSubscriber,
} from "@/db/queries/newsletter";

// Public - no auth, matches v1's NewsletterController::add().
export async function subscribeToNewsletterAction(
  mail: string,
): Promise<{ status: boolean; message?: string }> {
  return subscribeToNewsletter(mail);
}

// v1 gates only Admin here (not Mod, unlike the notice queue).
export async function deleteNewsletterSubscriberAction(
  id: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin]);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await deleteNewsletterSubscriber(id);
  return { status: true };
}
