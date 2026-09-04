"use server";

import { redirect } from "next/navigation";
import { verifyMailCode, resendVerificationCode } from "@/db/queries/auth-account";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function verifyMailAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const code = String(formData.get("code") ?? "");

  try {
    await verifyMailCode(userId, code);
  } catch (err) {
    redirect(`/dogrula?userId=${userId}&error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect("/");
}

export async function resendVerificationCodeAction(userId: number): Promise<{ status: boolean; message?: string; devCode?: string }> {
  const ip = await getClientIp();
  if (!checkRateLimit(`resend-code:${ip}`, 3, 15 * 60 * 1000)) {
    return { status: false, message: "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin." };
  }

  try {
    const result = await resendVerificationCode(userId);
    return { status: true, devCode: result.mailSent ? undefined : result.verificationCode };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
