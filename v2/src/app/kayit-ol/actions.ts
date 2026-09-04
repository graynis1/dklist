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

  try {
    const result = await registerUser({ name, surname, username, mail, birthDate, sex, password });
    userId = result.userId;
    verificationCode = result.verificationCode;
  } catch (err) {
    redirect(`/kayit-ol?error=${encodeURIComponent((err as Error).message)}`);
  }

  // Real, confirmed production incident (2026-09-04): Brevo accepts and
  // queues every send (SMTP returns 250 OK) but multiple real end-to-end
  // tests to two different providers never actually arrived - a silent
  // post-acceptance drop invisible to this app (no error, nothing to
  // catch/retry). `mailSent` (= isMailConfigured()) can no longer be
  // trusted as a proxy for "will actually be delivered", so the code is
  // now always shown on-screen too, not just when mail isn't configured -
  // the email is still attempted in the background in case Brevo recovers,
  // but nobody is locked out of registering while that gets sorted out.
  const codeParam = `&code=${verificationCode}`;
  try {
    await signIn("credentials", { username, password, redirectTo: `/dogrula?userId=${userId}${codeParam}` });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/giris?error=${error.type}`);
    }
    throw error;
  }
}
