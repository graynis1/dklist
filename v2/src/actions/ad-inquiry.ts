"use server";

import { requireRole, USER_TYPES } from "@/lib/permission";
import { createAdInquiry, setAdInquiryHandled, type CreateAdInquiryInput } from "@/db/queries/ad-inquiry";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Public - no auth, matches the newsletter signup's own gating (anyone
// browsing the marketing page should be able to submit an inquiry).
export async function submitAdInquiryAction(
  input: CreateAdInquiryInput,
): Promise<{ status: boolean; message?: string }> {
  const ip = await getClientIp();
  if (!checkRateLimit(`ad-inquiry:${ip}`, 5, 60 * 60 * 1000)) {
    return { status: false, message: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." };
  }
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
