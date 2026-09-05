import { NextRequest, NextResponse } from "next/server";
import { processStorePinCallback } from "@/db/queries/store-pin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com";

/** Same design as /api/iyzico/premium-callback - a separate route since
 * this resolves against store_pin_purchase, not premium_purchase/store_order. */
export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const token = (formData?.get("token") as string | null) ?? request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  const result = await processStorePinCallback(token).catch(() => null);
  if (!result) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=${result.status}`);
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request);
}
