import { createMultiItemCheckout } from "@/db/queries/store-order";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Same real-money handoff pattern as `/premium/checkout` - opens
 * İyzico's own hosted checkout in an in-app browser sheet, never
 * collects card details natively. Only ever applies to "paid" Askıda
 * Kitap listings; free listings have no checkout step at all (the buyer
 * just messages the seller). */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const storeIds = Array.isArray(body?.storeIds) ? body.storeIds.map(Number) : [];
  const shipping = body?.shipping ?? {};
  const buyerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";

  try {
    const result = await createMultiItemCheckout(
      session.userId,
      storeIds,
      {
        shippingName: shipping.name ?? "",
        shippingPhone: shipping.phone ?? "",
        shippingAddress: shipping.address ?? "",
        shippingCity: shipping.city ?? "",
        shippingDistrict: shipping.district,
        shippingZip: shipping.zip,
      },
      buyerIp,
    );
    return mobileJson({ status: "ok", paymentPageUrl: result.paymentPageUrl ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ödeme başlatılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
