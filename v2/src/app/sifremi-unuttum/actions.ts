"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/db/queries/auth-account";

export async function requestPasswordResetAction(formData: FormData) {
  const target = String(formData.get("target") ?? "");

  let userId: number;
  let resetCode: string;
  let mailSent: boolean;
  try {
    const result = await requestPasswordReset(target);
    userId = result.userId;
    resetCode = result.resetCode;
    mailSent = result.mailSent;
  } catch (err) {
    redirect(`/sifremi-unuttum?error=${encodeURIComponent((err as Error).message)}`);
  }

  const codeParam = mailSent ? "" : `&devCode=${resetCode}`;
  redirect(`/sifre-sifirla?userId=${userId}${codeParam}`);
}
