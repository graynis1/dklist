"use server";

import { redirect } from "next/navigation";
import { confirmPasswordReset } from "@/db/queries/auth-account";

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
