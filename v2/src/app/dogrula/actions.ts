"use server";

import { redirect } from "next/navigation";
import { verifyMailCode } from "@/db/queries/auth-account";

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
