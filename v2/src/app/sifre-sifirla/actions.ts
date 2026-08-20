"use server";

import { redirect } from "next/navigation";
import { confirmPasswordReset } from "@/db/queries/auth-account";

export async function confirmPasswordResetAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  const code = String(formData.get("code") ?? "");

  let newPassword: string;
  try {
    newPassword = await confirmPasswordReset(userId, code);
  } catch (err) {
    redirect(`/sifre-sifirla?userId=${userId}&error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/sifre-sifirla?userId=${userId}&newPassword=${encodeURIComponent(newPassword)}`);
}
