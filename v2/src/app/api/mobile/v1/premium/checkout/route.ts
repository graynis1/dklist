import { createPremiumCheckout } from "@/db/queries/premium";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Hands off to İyzico's own hosted checkout page (opened by the mobile app
 * in an in-app browser sheet, not embedded) instead of collecting card
 * details natively - the same real security boundary the web app already
 * relies on (this app never touches raw card data), and the same
 * `IyzicoNotConfiguredException` → readable-error path the web checkout
 * hits when the site's real İyzico keys aren't set yet.
 */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const buyerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com"}/api/iyzico/premium-callback`;

  try {
    const result = await createPremiumCheckout(session.userId, buyerIp, callbackUrl);
    return mobileJson({ status: "ok", paymentPageUrl: result.paymentPageUrl ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ödeme başlatılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
