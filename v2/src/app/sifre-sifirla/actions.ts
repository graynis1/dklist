"use server";

import { redirect } from "next/navigation";
import { confirmPasswordReset, resendResetCode } from "@/db/queries/auth-account";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function confirmPasswordResetAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const code = String(formData.get("code") ?? "");

  let newPassword: string;
  let mailSent: boolean;
  try {
    const result = await confirmPasswordReset(userId, code);
    newPassword = result.newPassword;
    mailSent = result.mailSent;
  } catch (err) {
    redirect(`/sifre-sifirla?userId=${userId}&error=${encodeURIComponent((err as Error).message)}`);
  }

  if (mailSent) {
    redirect(`/sifre-sifirla?userId=${userId}&mailSent=1`);
  }
  redirect(`/sifre-sifirla?userId=${userId}&newPassword=${encodeURIComponent(newPassword)}`);
}

export async function resendResetCodeAction(userId: number): Promise<{ status: boolean; message?: string; devCode?: string }> {
  const ip = await getClientIp();
  if (!checkRateLimit(`resend-reset-code:${ip}`, 3, 15 * 60 * 1000)) {
    return { status: false, message: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." };
  }

  try {
    const result = await resendResetCode(userId);
    return { status: true, devCode: result.mailSent ? undefined : result.resetCode };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
