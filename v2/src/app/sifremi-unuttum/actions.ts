"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/db/queries/auth-account";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function requestPasswordResetAction(formData: FormData) {
  const target = String(formData.get("target") ?? "");

  // Prevents both email-bombing a real account and brute-forcing the
  // target-account lookup itself - no limit existed before this.
  const ip = await getClientIp();
  if (!checkRateLimit(`reset-request:${ip}:${target}`, 5, 15 * 60 * 1000)) {
    redirect(`/sifremi-unuttum?error=${encodeURIComponent("Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.")}`);
  }

  let userId: number;
  let resetCode: string;
  try {
    const result = await requestPasswordReset(target);
    userId = result.userId;
    resetCode = result.resetCode;
  } catch (err) {
    redirect(`/sifremi-unuttum?error=${encodeURIComponent((err as Error).message)}`);
  }

  // Real, confirmed production incident (2026-09-04) - see
  // kayit-ol/actions.ts's registerAction() doc comment: Brevo accepts and
  // queues every send but real end-to-end tests never actually arrive, so
  // `mailSent` can no longer be trusted alone - the code is now always
  // shown on-screen too, not just when mail isn't configured.
  const codeParam = `&code=${resetCode}`;
  redirect(`/sifre-sifirla?userId=${userId}${codeParam}`);
}
