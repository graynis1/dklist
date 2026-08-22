"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createAdInquiry, setAdInquiryHandled, type CreateAdInquiryInput } from "@/db/queries/ad-inquiry";

// Public - no auth, matches the newsletter signup's own gating (anyone
// browsing the marketing page should be able to submit an inquiry).
export async function submitAdInquiryAction(
  input: CreateAdInquiryInput,
): Promise<{ status: boolean; message?: string }> {
  try {
    await createAdInquiry(input);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function setAdInquiryHandledAction(
  id: number,
  handled: boolean,
): Promise<{ status: boolean; message?: string }> {
  try {
    await requireRole([USER_TYPES.Admin, USER_TYPES.Mod]);
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
  await setAdInquiryHandled(id, handled);
  return { status: true };
}
