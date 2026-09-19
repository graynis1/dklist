"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { storeCartItem } from "@/db/schema";
import { getCartGroupedBySeller } from "@/db/queries/store";
import { createMultiItemCheckout } from "@/db/queries/store-order";

export async function createCartCheckoutAction(sellerId: number, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");
  const buyerId = Number(session.user.id);

  const groups = await getCartGroupedBySeller(buyerId);
  const group = groups.find((g) => g.sellerId === sellerId);
  if (!group || group.items.length === 0) redirect("/sepetim");

  const storeIds = group.items.map((i) => i.id);

  const headerList = await headers();
  const buyerIp = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";

  // redirect() throws internally - must never be called from inside the
  // try block (matches the single-item checkout action's own note).
  let redirectTo: string;
  try {
    const result = await createMultiItemCheckout(
      buyerId,
      storeIds,
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

    // Checkout succeeded (orders created, payment form initialized) - these
    // items are now real pending orders, not "still shopping" cart rows.
    await db.delete(storeCartItem).where(and(eq(storeCartItem.userId, buyerId), inArray(storeCartItem.storeId, storeIds)));

    redirectTo = result.paymentPageUrl || `/odeme-sonuc?orderId=${result.orderIds[0]}&status=pending`;
  } catch (err) {
    redirectTo = `/sepetim/odeme?sellerId=${sellerId}&error=${encodeURIComponent((err as Error).message)}`;
  }

  redirect(redirectTo);
}
