import { NextRequest, NextResponse } from "next/server";
import { processPremiumCallback } from "@/db/queries/premium";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com";

/** Same design as /api/iyzico/callback (the marketplace webhook) - iyzico
 * POSTs the checkout token back here for a premium-membership purchase,
 * a separate route since it resolves against premium_purchase, not
 * store_order. */
export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const token = (formData?.get("token") as string | null) ?? request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  const result = await processPremiumCallback(token).catch(() => null);
  if (!result) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=${result.status}`);
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request);
}
