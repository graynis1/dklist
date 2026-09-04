"use server";

import { redirect } from "next/navigation";
import { confirmPasswordReset, resendResetCode } from "@/db/queries/auth-account";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function confirmPasswordResetAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const code = String(formData.get("code") ?? "");

  let newPassword: string;
  try {
    const result = await confirmPasswordReset(userId, code);
    newPassword = result.newPassword;
  } catch (err) {
    redirect(`/sifre-sifirla?userId=${userId}&error=${encodeURIComponent((err as Error).message)}`);
  }

  // Real, confirmed production incident (2026-09-04) - see
  // kayit-ol/actions.ts's registerAction() doc comment. This is the most
  // critical of the four "show the code/password on screen too" fixes:
  // this IS the new password itself, with no separate resend path -
  // trusting a since-disproven `mailSent` here would have meant a real
  // chance of permanently locking someone out of their own account.
  redirect(`/sifre-sifirla?userId=${userId}&newPassword=${encodeURIComponent(newPassword)}`);
}

export async function resendResetCodeAction(userId: number): Promise<{ status: boolean; message?: string; devCode?: string }> {
  const ip = await getClientIp();
  if (!checkRateLimit(`resend-reset-code:${ip}`, 3, 15 * 60 * 1000)) {
    return { status: false, message: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." };
  }

  try {
    const result = await resendResetCode(userId);
    // Always return the code - see registerAction()'s doc comment for why
    // `mailSent` can no longer be trusted alone.
    return { status: true, devCode: result.resetCode };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
