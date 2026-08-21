"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { getStoreBySlug } from "@/db/queries/store";
import { createCheckout } from "@/db/queries/store-order";

export async function createCheckoutAction(slug: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const store = await getStoreBySlug(slug);
  if (!store) redirect("/askida-kitap");

  const headerList = await headers();
  const buyerIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";

  // redirect() throws internally (a special Next.js control-flow signal) -
  // it must never be called from inside this try block, or the redirect
  // itself would get swallowed as a generic caught error.
  let redirectTo: string;
  try {
    const result = await createCheckout(
      Number(session.user.id),
      store.id,
      {
        shippingName: String(formData.get("shippingName") ?? ""),
        shippingPhone: String(formData.get("shippingPhone") ?? ""),
        shippingAddress: String(formData.get("shippingAddress") ?? ""),
        shippingCity: String(formData.get("shippingCity") ?? ""),
        shippingDistrict: String(formData.get("shippingDistrict") ?? ""),
        shippingZip: String(formData.get("shippingZip") ?? ""),
      },
      buyerIp,
    );

    // Some iyzico response modes only return checkoutFormContent (an
    // embeddable widget), not a direct redirect URL - route to the result
    // page with the order id so the buyer isn't left stranded either way.
    redirectTo = result.paymentPageUrl || `/odeme-sonuc?orderId=${result.orderId}&status=pending`;
  } catch (err) {
    redirectTo = `/askida-kitap/${slug}/satin-al?error=${encodeURIComponent((err as Error).message)}`;
  }

  redirect(redirectTo);
}
