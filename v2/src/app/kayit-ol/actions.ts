"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { registerUser } from "@/db/queries/auth-account";

export async function registerAction(formData: FormData) {
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

  try {
    const result = await registerUser({ name, surname, username, mail, birthDate, sex, password });
    userId = result.userId;
    verificationCode = result.verificationCode;
    mailSent = result.mailSent;
  } catch (err) {
    redirect(`/kayit-ol?error=${encodeURIComponent((err as Error).message)}`);
  }

  const codeParam = mailSent ? "" : `&devCode=${verificationCode}`;
  try {
    await signIn("credentials", { username, password, redirectTo: `/dogrula?userId=${userId}${codeParam}` });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/giris?error=${error.type}`);
    }
    throw error;
  }
}
