import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { premiumSettings, premiumPurchase, user } from "@/db/schema";
import { getIyzicoConfig } from "@/db/queries/marketplace-settings";
import { createDirectCheckoutForm, retrieveCheckoutForm, IyzicoNotConfiguredException } from "@/lib/iyzico";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export interface PremiumSettingsView {
  active: boolean;
  priceKurus: number;
  durationDays: number;
}

async function getOrCreateSettingsRow() {
  const [row] = await db.select().from(premiumSettings).limit(1);
  if (row) return row;
  const [result] = await db.insert(premiumSettings).values({ active: 0, priceKurus: 4900, durationDays: 365 });
  const [created] = await db.select().from(premiumSettings).where(eq(premiumSettings.id, result.insertId)).limit(1);
  return created;
}

export async function getPremiumSettings(): Promise<PremiumSettingsView> {
  const row = await getOrCreateSettingsRow();
  return { active: row.active === 1, priceKurus: row.priceKurus, durationDays: row.durationDays };
}

export async function updatePremiumSettings(input: { active: boolean; priceKurus: number; durationDays: number }): Promise<void> {
  if (input.priceKurus <= 0) throw new Error("Fiyat pozitif olmalıdır.");
  if (input.durationDays <= 0) throw new Error("Süre pozitif olmalıdır.");
  const row = await getOrCreateSettingsRow();
  await db.update(premiumSettings).set({
    active: input.active ? 1 : 0,
    priceKurus: input.priceKurus,
    durationDays: input.durationDays,
    updatedDate: nowSql(),
  }).where(eq(premiumSettings.id, row.id));
}

/** A user is premium if they have any purchase whose expires_at is still
 * in the future - computed fresh each time (no denormalized flag to keep
 * in sync), same reasoning as this session's other "recompute, don't
 * cache a flag" choices (e.g. isRecentlyActive()). */
export async function isUserPremium(userId: number): Promise<boolean> {
  const [row] = await db.select({ expiresAt: premiumPurchase.expiresAt }).from(premiumPurchase)
    .where(eq(premiumPurchase.userId, userId))
    .orderBy(desc(premiumPurchase.expiresAt))
    .limit(1);
  if (!row?.expiresAt) return false;
  return new Date(row.expiresAt).getTime() > Date.now();
}

export async function getPremiumExpiry(userId: number): Promise<string | null> {
  const [row] = await db.select({ expiresAt: premiumPurchase.expiresAt }).from(premiumPurchase)
    .where(eq(premiumPurchase.userId, userId))
    .orderBy(desc(premiumPurchase.expiresAt))
    .limit(1);
  return row?.expiresAt ?? null;
}

export async function createPremiumCheckout(userId: number, buyerIp: string, callbackUrl: string): Promise<{ purchaseId: number; paymentPageUrl?: string }> {
  const settings = await getPremiumSettings();
  if (!settings.active) throw new Error("Premium üyelik şu anda satışa kapalı.");

  const [userRow] = await db.select({ username: user.username, mail: user.mail }).from(user).where(eq(user.id, userId)).limit(1);
  if (!userRow) throw new Error("Kullanıcı bulunamadı.");

  const conversationId = `premium-conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = nowSql();
  const [purchaseResult] = await db.insert(premiumPurchase).values({
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
      basketId: `premium-${purchaseId}`,
      itemName: "DKList Premium Üyelik",
      callbackUrl,
      buyerIp,
      buyerId: userId,
      buyerUsername: userRow.username,
      buyerMail: userRow.mail,
    });
    await db.update(premiumPurchase).set({ iyzicoToken: result.token }).where(eq(premiumPurchase.id, purchaseId));
    return { purchaseId, paymentPageUrl: result.paymentPageUrl };
  } catch (error) {
    await db.update(premiumPurchase).set({ status: "failed" }).where(eq(premiumPurchase.id, purchaseId));
    if (error instanceof IyzicoNotConfiguredException) {
      throw new Error("Ödeme sistemi şu anda yapılandırılmamış, lütfen daha sonra tekrar deneyin.");
    }
    throw new Error(`Ödeme başlatılamadı: ${error instanceof Error ? error.message : "bilinmeyen hata"}`);
  }
}

/** Ports the same row-locked idempotent-webhook pattern as
 * processIyzicoCallback() (store-order.ts) - iyzico can resend the
 * callback, so re-processing an already-paid purchase must be a no-op. */
export async function processPremiumCallback(token: string): Promise<{ status: "success" | "failed" | "error" } | null> {
  const [lookup] = await db.select({ id: premiumPurchase.id }).from(premiumPurchase).where(eq(premiumPurchase.iyzicoToken, token)).limit(1);
  if (!lookup) return null;

  return db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(premiumPurchase).where(eq(premiumPurchase.id, lookup.id)).for("update");
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
      // Stacks onto the user's current expiry if they already have active
      // premium (renewing early doesn't waste remaining time), otherwise
      // starts from now.
      const [existingActive] = await tx.select({ expiresAt: premiumPurchase.expiresAt }).from(premiumPurchase)
        .where(eq(premiumPurchase.userId, purchase.userId))
        .orderBy(desc(premiumPurchase.expiresAt))
        .limit(1);
      const baseDate = existingActive?.expiresAt && new Date(existingActive.expiresAt).getTime() > Date.now()
        ? new Date(existingActive.expiresAt)
        : new Date();
      const expiresAt = new Date(baseDate.getTime() + purchase.durationDays * 24 * 60 * 60 * 1000);

      await tx.update(premiumPurchase).set({
        status: "active",
        iyzicoPaymentId: result.paymentId ?? null,
        startsAt: now,
        expiresAt: expiresAt.toISOString().slice(0, 19).replace("T", " "),
        updatedDate: now,
      }).where(eq(premiumPurchase.id, purchase.id));
    } else {
      await tx.update(premiumPurchase).set({ status: "failed", updatedDate: now }).where(eq(premiumPurchase.id, purchase.id));
    }

    return { status: paymentSuccessful ? "success" as const : "failed" as const };
  });
}
