import { NextRequest, NextResponse } from "next/server";
import { processIyzicoCallback } from "@/db/queries/store-order";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com";

/**
 * Ports v1's real IyzicoWebhookController::handle() - iyzico's Checkout
 * Form flow POSTs (form-encoded "token") back here once the buyer's
 * payment completes or fails; we never trust anything from the client
 * request body itself, only the token, which is then used to ask iyzico
 * server-to-server what actually happened (processIyzicoCallback ->
 * retrieveCheckoutForm).
 */
export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const token = (formData?.get("token") as string | null) ?? request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  const result = await processIyzicoCallback(token).catch(() => null);
  if (!result) {
    return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/odeme-sonuc?orderId=${result.orderId}&status=${result.status}`);
}

export async function GET(request: NextRequest): Promise<Response> {
  return POST(request);
}
