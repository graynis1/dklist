"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { createPremiumCheckout } from "@/db/queries/premium";

export async function purchasePremiumAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const headerList = await headers();
  const buyerIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com"}/api/iyzico/premium-callback`;

  let redirectTo: string;
  try {
    const result = await createPremiumCheckout(Number(session.user.id), buyerIp, callbackUrl);
    redirectTo = result.paymentPageUrl || `/odeme-sonuc?status=pending`;
  } catch (err) {
    redirectTo = `/premium?error=${encodeURIComponent((err as Error).message)}`;
  }

  redirect(redirectTo);
}
