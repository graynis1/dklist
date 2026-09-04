"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { registerUser } from "@/db/queries/auth-account";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function registerAction(formData: FormData) {
  const ip = await getClientIp();
  if (!checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    redirect(`/kayit-ol?error=${encodeURIComponent("Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin.")}`);
  }

  const name = String(formData.get("name") ?? "");
  const surname = String(formData.get("surname") ?? "");
  const username = String(formData.get("username") ?? "");
  const mail = String(formData.get("mail") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "");
  const sex = String(formData.get("sex") ?? "");
  const password = String(formData.get("password") ?? "");

  let userId: number;
  let verificationCode: string;
  let mailSent: boolean;
  let verificationRequired: boolean;

  try {
    const result = await registerUser({ name, surname, username, mail, birthDate, sex, password });
    userId = result.userId;
    verificationCode = result.verificationCode;
    mailSent = result.mailSent;
    verificationRequired = result.verificationRequired;
  } catch (err) {
    redirect(`/kayit-ol?error=${encodeURIComponent((err as Error).message)}`);
  }

  // Customer's explicit ask (2026-09-04) while Brevo delivery is broken:
  // new members should land as a fully usable account with zero extra
  // step, not a verification gate nobody can complete right now - see
  // EMAIL_VERIFICATION_REQUIRED's doc comment.
  const redirectTo = verificationRequired
    ? `/dogrula?userId=${userId}${mailSent ? "" : `&devCode=${verificationCode}`}`
    : "/";
  try {
    await signIn("credentials", { username, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/giris?error=${error.type}`);
    }
    throw error;
  }
}
