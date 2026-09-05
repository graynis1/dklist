import "server-only";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { storePinSettings, storePinPurchase, store, user } from "@/db/schema";
import { getIyzicoConfig } from "@/db/queries/marketplace-settings";
import { createDirectCheckoutForm, retrieveCheckoutForm, IyzicoNotConfiguredException } from "@/lib/iyzico";

/**
 * Real customer report (2026-09-05, Askıda Kitap section): "üste tutturma
 * renkli çerçeve vs gibi özellikler satın alma kısmı olabilir mi?
 * sahibinden.com da olduğu gibi." A per-LISTING paid highlight - distinct
 * from the existing site-wide Premium membership's incidental "Öne Çıkan"
 * sort/badge perk (see store.ts's ownerIsPremiumExpr()). Deliberately
 * mirrors premium.ts's exact shape (settings row + one-purchase-per-row
 * table, same Iyzico direct-checkout flow) rather than inventing a new
 * payment pattern.
 */
function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export interface StorePinSettingsView {
  active: boolean;
  priceKurus: number;
  durationDays: number;
}

async function getOrCreateSettingsRow() {
  const [row] = await db.select().from(storePinSettings).limit(1);
  if (row) return row;
  const [result] = await db.insert(storePinSettings).values({ active: 0, priceKurus: 1900, durationDays: 7 });
  const [created] = await db.select().from(storePinSettings).where(eq(storePinSettings.id, result.insertId)).limit(1);
  return created;
}

export async function getStorePinSettings(): Promise<StorePinSettingsView> {
  const row = await getOrCreateSettingsRow();
  return { active: row.active === 1, priceKurus: row.priceKurus, durationDays: row.durationDays };
}

export async function updateStorePinSettings(input: { active: boolean; priceKurus: number; durationDays: number }): Promise<void> {
  if (input.priceKurus <= 0) throw new Error("Fiyat pozitif olmalıdır.");
  if (input.durationDays <= 0) throw new Error("Süre pozitif olmalıdır.");
  const row = await getOrCreateSettingsRow();
  await db.update(storePinSettings).set({
    active: input.active ? 1 : 0,
    priceKurus: input.priceKurus,
    durationDays: input.durationDays,
    updatedDate: nowSql(),
  }).where(eq(storePinSettings.id, row.id));
}

/** Computed fresh from the purchase log, same "don't cache a flag on the
 * parent row" reasoning as isUserPremium() - a listing's pinned state
 * changes rarely enough (bought once, expires once) that this isn't a
 * hot-path concern, and it avoids a second source of truth to keep in
 * sync with `store_pin_purchase.expires_at`. */
export async function isStorePinned(storeId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: storePinPurchase.id })
    .from(storePinPurchase)
    .where(and(eq(storePinPurchase.storeId, storeId), eq(storePinPurchase.status, "active"), gt(storePinPurchase.expiresAt, nowSql())))
    .limit(1);
  return Boolean(row);
}

export async function createStorePinCheckout(
  userId: number,
  storeId: number,
  buyerIp: string,
  callbackUrl: string,
): Promise<{ purchaseId: number; paymentPageUrl?: string }> {
  const settings = await getStorePinSettings();
  if (!settings.active) throw new Error("İlan öne çıkarma şu anda satışa kapalı.");

  const [storeRow] = await db.select({ ownerId: store.ownerId, title: store.title }).from(store).where(eq(store.id, storeId)).limit(1);
  if (!storeRow) throw new Error("İlan bulunamadı.");
  if (storeRow.ownerId !== userId) throw new Error("Sadece kendi ilanınızı öne çıkarabilirsiniz.");

  const [userRow] = await db.select({ username: user.username, mail: user.mail }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) throw new Error("Kullanıcı bulunamadı.");

  const conversationId = `store-pin-conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = nowSql();
  const [purchaseResult] = await db.insert(storePinPurchase).values({
    storeId,
    userId,
    amountKurus: settings.priceKurus,
    durationDays: settings.durationDays,
    status: "pending_payment",
    createdDate: now,
    iyzicoConversationId: conversationId,
  });
  const purchaseId = purchaseResult.insertId;

  try {
    const config = await getIyzicoConfig();
    const result = await createDirectCheckoutForm(config, {
      conversationId,
      priceTl: settings.priceKurus / 100,
      basketId: `store-pin-${purchaseId}`,
      itemName: `İlanı Öne Çıkar: ${storeRow.title}`,
      callbackUrl,
      buyerIp,
      buyerId: userId,
      buyerUsername: userRow.username,
      buyerMail: userRow.mail,
    });
    await db.update(storePinPurchase).set({ iyzicoToken: result.token }).where(eq(storePinPurchase.id, purchaseId));
    return { purchaseId, paymentPageUrl: result.paymentPageUrl };
  } catch (error) {
    await db.update(storePinPurchase).set({ status: "failed" }).where(eq(storePinPurchase.id, purchaseId));
    if (error instanceof IyzicoNotConfiguredException) {
      throw new Error("Ödeme sistemi şu anda yapılandırılmamış, lütfen daha sonra tekrar deneyin.");
    }
    throw new Error(`Ödeme başlatılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
}

/** Same row-locked idempotent-webhook pattern as processPremiumCallback()/
 * processIyzicoCallback() - iyzico can resend the callback, re-processing
 * an already-paid purchase must be a no-op. Unlike premium (which stacks
 * onto the user's current expiry), a re-pin always starts a fresh window
 * from now - matches how a real "bump to top" listing feature behaves
 * elsewhere (sahibinden.com), simpler than reasoning about overlapping
 * pin windows on the same listing. */
export async function processStorePinCallback(token: string): Promise<{ status: "success" | "failed" | "error" } | null> {
  const [lookup] = await db.select({ id: storePinPurchase.id }).from(storePinPurchase).where(eq(storePinPurchase.iyzicoToken, token)).limit(1);
  if (!lookup) return null;

  return db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(storePinPurchase).where(eq(storePinPurchase.id, lookup.id)).for("update");
    if (!purchase) return null;

    if (purchase.status !== "pending_payment") {
      return { status: purchase.status === "active" ? ("success" as const) : ("failed" as const) };
    }

    const config = await getIyzicoConfig();
    let result;
    try {
      result = await retrieveCheckoutForm(config, token);
    } catch {
      return { status: "error" as const };
    }

    const paymentSuccessful = result.status === "success" && result.paymentStatus === "SUCCESS";
    const now = nowSql();

    if (paymentSuccessful) {
      const expiresAt = new Date(Date.now() + purchase.durationDays * 24 * 60 * 60 * 1000);
      await tx.update(storePinPurchase).set({
        status: "active",
        iyzicoPaymentId: result.paymentId ?? null,
        startsAt: now,
        expiresAt: expiresAt.toISOString().slice(0, 19).replace("T", " "),
        updatedDate: now,
      }).where(eq(storePinPurchase.id, purchase.id));
    } else {
      await tx.update(storePinPurchase).set({ status: "failed", updatedDate: now }).where(eq(storePinPurchase.id, purchase.id));
    }

    return { status: paymentSuccessful ? "success" as const : "failed" as const };
  });
}
