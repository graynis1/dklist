"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { createStorePinCheckout } from "@/db/queries/store-pin";

export async function purchaseStorePinAction(storeId: number, slug: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const headerList = await headers();
  const buyerIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com"}/api/iyzico/store-pin-callback`;

  let redirectTo: string;
  try {
    const result = await createStorePinCheckout(Number(session.user.id), storeId, buyerIp, callbackUrl);
    redirectTo = result.paymentPageUrl || `/odeme-sonuc?status=pending`;
  } catch (err) {
    redirectTo = `/askida-kitap/${slug}/one-cikar?error=${encodeURIComponent((err as Error).message)}`;
  }

  redirect(redirectTo);
}
