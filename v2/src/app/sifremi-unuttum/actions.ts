"use server";

import { redirect } from "next/navigation";
import { requestPasswordReset } from "@/db/queries/auth-account";

export async function requestPasswordResetAction(formData: FormData) {
  const target = String(formData.get("target") ?? "");

  let userId: number;
  let resetCode: string;
  try {
    const result = await requestPasswordReset(target);
    userId = result.userId;
    resetCode = result.resetCode;
  } catch (err) {
    redirect(`/sifremi-unuttum?error=${encodeURIComponent((err as Error).message)}`);
  }

  redirect(`/sifre-sifirla?userId=${userId}&devCode=${resetCode}`);
}
