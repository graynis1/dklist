import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { store, storeOrder, storePicture, user, sellerPayoutProfile } from "@/db/schema";
import { getIyzicoConfig, getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import {
  createCheckoutForm,
  retrieveCheckoutForm,
  refundPayment,
  isIyzicoConfigured,
  IyzicoNotConfiguredException,
} from "@/lib/iyzico";
import { storeImageUrl } from "@/db/queries/store";
import { addNotification } from "@/db/queries/notifications";

export type StoreOrderStatus =
  | "pending_payment" | "paid" | "shipped" | "completed" | "cancelled" | "refunded" | "failed";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function restoreStock(storeId: number): Promise<void> {
  await db.execute(sql`UPDATE store SET stock = stock + 1 WHERE id = ${storeId}`);
}

export interface CreateCheckoutInput {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingDistrict?: string;
  shippingZip?: string;
}

/**
 * Ports v1's real StoreOrderController::createCheckout() - the same-shape
 * atomic stock reservation (a single `stock = stock - 1 WHERE stock > 0`
 * UPDATE, so two concurrent buyers of the last copy can't both succeed),
 * seller-payout-profile gate (must be an active iyzico sub-merchant before
 * anyone can buy from them), and commission split at checkout time (frozen
 * onto the order row so a later commission-rate change never touches past
 * orders).
 */
export async function createCheckout(
  buyerId: number,
  storeId: number,
  input: CreateCheckoutInput,
  buyerIp: string,
): Promise<{ orderId: number; paymentPageUrl?: string; checkoutFormContent?: string }> {
  const marketplace = await getMarketplaceStatus();
  if (!marketplace.active) {
    throw new Error("Ücretli ilan satın alma özelliği şu anda kapalı.");
  }

  const [storeRow] = await db.select().from(store).where(eq(store.id, storeId)).limit(1);
  if (!storeRow) throw new Error("Böyle bir ilan yok.");
  if (storeRow.listingType !== "paid" || !storeRow.price || storeRow.price <= 0) {
    throw new Error("Bu ilan satın alınabilir bir ilan değil.");
  }
  if (storeRow.status !== "active" || storeRow.isActive !== 1) {
    throw new Error("Bu ilan artık mevcut değil.");
  }
  if (storeRow.ownerId === buyerId) {
    throw new Error("Kendi ilanınızı satın alamazsınız.");
  }
  if (storeRow.stock !== null && storeRow.stock <= 0) {
    throw new Error("Bu ilan stokta yok.");
  }

  const [payoutProfile] = await db.select().from(sellerPayoutProfile).where(eq(sellerPayoutProfile.userId, storeRow.ownerId)).limit(1);
  if (!payoutProfile || payoutProfile.status !== "active" || !payoutProfile.iyzicoSubMerchantKey) {
    throw new Error("Satıcı henüz ödeme almak için gerekli kaydı tamamlamamış.");
  }

  const shippingName = input.shippingName.trim();
  const shippingPhone = input.shippingPhone.trim();
  const shippingAddress = input.shippingAddress.trim();
  const shippingCity = input.shippingCity.trim();
  if (!shippingName || !shippingPhone || !shippingAddress || !shippingCity) {
    throw new Error("Teslimat bilgilerini eksiksiz doldurmanız gerekiyor.");
  }

  const amountKurus = Math.round(storeRow.price * 100);
  const commissionKurus = Math.round(amountKurus * (marketplace.commissionRate / 100));
  const sellerPayoutKurus = amountKurus - commissionKurus;

  let stockReserved = false;
  if (storeRow.stock !== null) {
    const result = await db.execute(sql`UPDATE store SET stock = stock - 1 WHERE id = ${storeId} AND stock > 0`);
    const affected = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    if (affected === 0) throw new Error("Bu ilan stokta yok.");
    stockReserved = true;
  }

  const conversationId = `order-conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = nowSql();

  const [orderResult] = await db.insert(storeOrder).values({
    storeId,
    buyerId,
    sellerId: storeRow.ownerId,
    amountKurus,
    commissionKurus,
    sellerPayoutKurus,
    currency: "TRY",
    status: "pending_payment",
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingCity,
    shippingDistrict: input.shippingDistrict?.trim() || null,
    shippingZip: input.shippingZip?.trim() || null,
    createdDate: now,
    iyzicoConversationId: conversationId,
  });
  const orderId = orderResult.insertId;

  try {
    const config = await getIyzicoConfig();
    const [buyerRow] = await db.select({ username: user.username, mail: user.mail }).from(user).where(eq(user.id, buyerId)).limit(1);
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com"}/api/iyzico/callback`;

    const result = await createCheckoutForm(config, {
      conversationId,
      priceTl: amountKurus / 100,
      sellerPayoutTl: sellerPayoutKurus / 100,
      basketId: `order-${orderId}`,
      storeTitle: storeRow.title,
      subMerchantKey: payoutProfile.iyzicoSubMerchantKey,
      callbackUrl,
      buyerIp,
      buyerId,
      buyerUsername: buyerRow?.username ?? "",
      buyerMail: buyerRow?.mail ?? null,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingZip: input.shippingZip?.trim() || null,
    });

    await db.update(storeOrder).set({ iyzicoToken: result.token }).where(eq(storeOrder.id, orderId));
    return { orderId, paymentPageUrl: result.paymentPageUrl, checkoutFormContent: result.checkoutFormContent };
  } catch (error) {
    if (stockReserved) await restoreStock(storeId);
    await db.update(storeOrder).set({ status: "failed" }).where(eq(storeOrder.id, orderId));
    if (error instanceof IyzicoNotConfiguredException) {
      throw new Error("Ödeme sistemi şu anda yapılandırılmamış, lütfen daha sonra tekrar deneyin.");
    }
    throw new Error(`Ödeme başlatılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
}

/**
 * Ports v1's real IyzicoWebhookController::handle() - iyzico POSTs the
 * checkout token back here (success or failure) after the buyer completes
 * or abandons the payment page. Row-locked (`FOR UPDATE`) inside a
 * transaction: iyzico can and does resend this callback, and a user can
 * reload the result page, so two overlapping calls must not both process
 * the same order (double stock-release, double notification).
 */
export async function processIyzicoCallback(token: string): Promise<{ orderId: number; status: "success" | "failed" | "error" } | null> {
  const [orderLookup] = await db.select({ id: storeOrder.id }).from(storeOrder).where(eq(storeOrder.iyzicoToken, token)).limit(1);
  if (!orderLookup) return null;

  const outcome = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(storeOrder).where(eq(storeOrder.id, orderLookup.id)).for("update");
    if (!order) return null;

    if (order.status !== "pending_payment") {
      return { orderId: order.id, status: order.status === "paid" ? ("success" as const) : ("failed" as const), storeId: order.storeId, alreadyProcessed: true };
    }

    const config = await getIyzicoConfig();
    let result;
    try {
      result = await retrieveCheckoutForm(config, token);
    } catch {
      return { orderId: order.id, status: "error" as const, storeId: order.storeId, alreadyProcessed: true };
    }

    const paymentSuccessful = result.status === "success" && result.paymentStatus === "SUCCESS";
    const now = nowSql();

    if (paymentSuccessful) {
      const transactionId = result.paymentItems?.[0]?.paymentTransactionId ?? null;
      await tx.update(storeOrder).set({
        status: "paid",
        iyzicoPaymentId: result.paymentId ?? null,
        iyzicoPaymentTransactionId: transactionId,
        updatedDate: now,
      }).where(eq(storeOrder.id, order.id));

      const [storeRow] = await tx.select({ stock: store.stock }).from(store).where(eq(store.id, order.storeId)).limit(1);
      if (storeRow?.stock !== null && storeRow !== undefined && storeRow.stock <= 0) {
        await tx.update(store).set({ status: "completed", isActive: 0 }).where(eq(store.id, order.storeId));
      }
    } else {
      await tx.update(storeOrder).set({ status: "failed", updatedDate: now }).where(eq(storeOrder.id, order.id));
      const [storeRow] = await tx.select({ stock: store.stock }).from(store).where(eq(store.id, order.storeId)).limit(1);
      if (storeRow?.stock !== null) {
        await tx.execute(sql`UPDATE store SET stock = stock + 1 WHERE id = ${order.storeId}`);
      }
    }

    return { orderId: order.id, status: paymentSuccessful ? "success" as const : "failed" as const, storeId: order.storeId, alreadyProcessed: false };
  });

  if (!outcome) return null;

  if (!outcome.alreadyProcessed && outcome.status === "success") {
    const [order] = await db.select().from(storeOrder).where(eq(storeOrder.id, outcome.orderId)).limit(1);
    if (order) {
      const [storeRow] = await db.select({ title: store.title }).from(store).where(eq(store.id, order.storeId)).limit(1);
      const title = storeRow?.title ?? "";
      await addNotification(order.sellerId, order.buyerId, `"${title}" ilanınız satın alındı! Sipariş detaylarını "Siparişlerim" sayfasından görebilirsiniz.`, `Your listing "${title}" was purchased! Check "My Orders" for details.`);
      await addNotification(order.buyerId, order.sellerId, `"${title}" siparişiniz alındı, satıcı kargoya verecek.`, `Your order "${title}" was received, the seller will ship it soon.`);
    }
  }

  return { orderId: outcome.orderId, status: outcome.status };
}

export interface StoreOrderView {
  id: number;
  status: StoreOrderStatus;
  amount: number;
  commission: number;
  sellerPayout: number;
  currency: string;
  trackingNumber: string | null;
  createdDate: string;
  store: { id: number; title: string; slug: string; image: string | null };
  buyer: { id: number; username: string };
  seller: { id: number; username: string };
}

async function serializeOrder(row: typeof storeOrder.$inferSelect): Promise<StoreOrderView> {
  const [storeRow] = await db.select({ id: store.id, title: store.title, slug: store.slug }).from(store).where(eq(store.id, row.storeId)).limit(1);
  const [picture] = await db.select({ imageName: storePicture.imageName }).from(storePicture).where(eq(storePicture.advertId, row.storeId)).limit(1);
  const [buyerRow] = await db.select({ username: user.username }).from(user).where(eq(user.id, row.buyerId)).limit(1);
  const [sellerRow] = await db.select({ username: user.username }).from(user).where(eq(user.id, row.sellerId)).limit(1);

  return {
    id: row.id,
    status: row.status as StoreOrderStatus,
    amount: row.amountKurus / 100,
    commission: row.commissionKurus / 100,
    sellerPayout: row.sellerPayoutKurus / 100,
    currency: row.currency,
    trackingNumber: row.trackingNumber,
    createdDate: row.createdDate,
    store: { id: storeRow?.id ?? row.storeId, title: storeRow?.title ?? "", slug: storeRow?.slug ?? "", image: picture ? storeImageUrl(picture.imageName) : null },
    buyer: { id: row.buyerId, username: buyerRow?.username ?? "" },
    seller: { id: row.sellerId, username: sellerRow?.username ?? "" },
  };
}

export async function listMyOrders(userId: number, role: "buyer" | "seller"): Promise<StoreOrderView[]> {
  const rows = await db.select().from(storeOrder)
    .where(role === "seller" ? eq(storeOrder.sellerId, userId) : eq(storeOrder.buyerId, userId))
    .orderBy(desc(storeOrder.id));
  return Promise.all(rows.map(serializeOrder));
}

export async function listAllOrdersAdmin(): Promise<StoreOrderView[]> {
  const rows = await db.select().from(storeOrder).orderBy(desc(storeOrder.id)).limit(200);
  return Promise.all(rows.map(serializeOrder));
}

async function getOrderOrThrow(orderId: number) {
  const [order] = await db.select().from(storeOrder).where(eq(storeOrder.id, orderId)).limit(1);
  if (!order) throw new Error("Böyle bir sipariş yok.");
  return order;
}

async function transitionStatus(
  userId: number,
  isElevated: boolean,
  orderId: number,
  fromStatus: StoreOrderStatus,
  toStatus: StoreOrderStatus,
  requiredRole: "buyer" | "seller",
  trackingNumber?: string,
): Promise<StoreOrderView> {
  const order = await getOrderOrThrow(orderId);
  const isRequiredRole = requiredRole === "seller" ? order.sellerId === userId : order.buyerId === userId;
  if (!isRequiredRole && !isElevated) throw new Error("Yetkisiz istek.");
  if (order.status !== fromStatus) throw new Error("Sipariş bu işlem için uygun durumda değil.");

  const now = nowSql();
  const finalTrackingNumber = toStatus === "shipped" && trackingNumber ? trackingNumber : order.trackingNumber;
  await db.update(storeOrder).set({
    status: toStatus,
    updatedDate: now,
    trackingNumber: finalTrackingNumber,
  }).where(eq(storeOrder.id, orderId));

  if (toStatus === "cancelled" && fromStatus === "pending_payment") {
    const [storeRow] = await db.select({ stock: store.stock }).from(store).where(eq(store.id, order.storeId)).limit(1);
    if (storeRow?.stock !== null) await restoreStock(order.storeId);
  }

  const [storeRow] = await db.select({ title: store.title }).from(store).where(eq(store.id, order.storeId)).limit(1);
  const title = storeRow?.title ?? "";
  const notifyMessages: Partial<Record<StoreOrderStatus, [string, string]>> = {
    shipped: [`"${title}" ilanınız kargoya verildi`, `Your order "${title}" has been shipped`],
    completed: [`"${title}" siparişi tamamlandı olarak işaretlendi`, `Order "${title}" was marked as completed`],
    cancelled: [`"${title}" siparişi iptal edildi`, `Order "${title}" was cancelled`],
  };
  const messages = notifyMessages[toStatus];
  if (messages) {
    const notifyTarget = requiredRole === "seller" ? order.buyerId : order.sellerId;
    await addNotification(notifyTarget, userId, messages[0], messages[1]);
  }

  return serializeOrder({ ...order, status: toStatus, updatedDate: now, trackingNumber: finalTrackingNumber });
}

export async function shipOrder(userId: number, isElevated: boolean, orderId: number, trackingNumber?: string): Promise<StoreOrderView> {
  return transitionStatus(userId, isElevated, orderId, "paid", "shipped", "seller", trackingNumber);
}

export async function completeOrder(userId: number, isElevated: boolean, orderId: number): Promise<StoreOrderView> {
  return transitionStatus(userId, isElevated, orderId, "shipped", "completed", "buyer");
}

export async function cancelOrder(userId: number, orderId: number): Promise<StoreOrderView> {
  const order = await getOrderOrThrow(orderId);

  // Ports v1's real race-condition guard: a "İptal Et" click and iyzico's
  // payment confirmation can land at nearly the same moment - ask iyzico
  // for the real current status before honoring a cancel, or the payment
  // could go through while the order is told it's cancelled.
  if (order.status === "pending_payment" && order.iyzicoToken) {
    const config = await getIyzicoConfig();
    if (isIyzicoConfigured(config)) {
      try {
        const result = await retrieveCheckoutForm(config, order.iyzicoToken);
        if (result.status === "success" && result.paymentStatus === "SUCCESS") {
          throw new Error("Ödemeniz az önce tamamlandı, sipariş artık iptal edilemez. Lütfen sayfayı yenileyin.");
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("Ödemeniz")) throw error;
      }
    }
  }

  return transitionStatus(userId, false, orderId, "pending_payment", "cancelled", "buyer");
}

/**
 * Ports v1's real StoreOrderController::refund() - a real gap it closed:
 * StoreOrderStatusEnum::Refunded existed but no endpoint ever used it until
 * this. Seller or an elevated (Admin/Mod) account can refund a Paid-but-
 * not-yet-shipped order.
 */
export async function refundOrder(userId: number, isElevated: boolean, orderId: number, requestIp: string): Promise<StoreOrderView> {
  const order = await getOrderOrThrow(orderId);
  const isSeller = order.sellerId === userId;
  if (!isSeller && !isElevated) throw new Error("Yetkisiz istek.");
  if (order.status !== "paid") throw new Error("Sadece ödenmiş ve henüz kargolanmamış siparişler iade edilebilir.");
  if (!order.iyzicoPaymentTransactionId) throw new Error("Bu sipariş için iyzico işlem kimliği kayıtlı değil, iade yapılamıyor.");

  const config = await getIyzicoConfig();
  try {
    await refundPayment(config, order.iyzicoPaymentTransactionId, order.amountKurus / 100, requestIp);
  } catch (error) {
    if (error instanceof IyzicoNotConfiguredException) throw new Error("Ödeme sistemi şu anda yapılandırılmamış.");
    throw new Error(`İade işlemi başarısız: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }

  const now = nowSql();
  await db.update(storeOrder).set({ status: "refunded", updatedDate: now }).where(eq(storeOrder.id, orderId));

  const [storeRow] = await db.select({ title: store.title, stock: store.stock }).from(store).where(eq(store.id, order.storeId)).limit(1);
  if (storeRow?.stock !== null) await restoreStock(order.storeId);

  const title = storeRow?.title ?? "";
  await addNotification(order.buyerId, order.sellerId, `"${title}" siparişiniz iade edildi, ödemeniz size geri gönderildi`, `Your order "${title}" was refunded`);

  return serializeOrder({ ...order, status: "refunded", updatedDate: now });
}
