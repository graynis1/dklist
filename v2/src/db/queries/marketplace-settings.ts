import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketplaceSettings } from "@/db/schema";
import type { IyzicoConfig } from "@/lib/iyzico";
import { isIyzicoConfigured } from "@/lib/iyzico";

export interface MarketplaceSettingsView {
  active: boolean;
  commissionRate: number;
  iyzicoApiKey: string | null;
  iyzicoSecretKey: string | null;
  iyzicoBaseUrl: string;
  configured: boolean;
}

/** Single-row settings table (id is always 1, matches v1's real
 * MarketplaceSettings design) - creates the default row on first read if
 * somehow missing rather than erroring, since every caller expects a value. */
async function getOrCreateSettingsRow() {
  const [row] = await db.select().from(marketplaceSettings).limit(1);
  if (row) return row;
  const [result] = await db.insert(marketplaceSettings).values({
    active: 0,
    commissionRate: 5.0,
    iyzicoBaseUrl: "https://sandbox-api.iyzipay.com",
  });
  const [created] = await db.select().from(marketplaceSettings).where(eq(marketplaceSettings.id, result.insertId)).limit(1);
  return created;
}

export async function getMarketplaceSettings(): Promise<MarketplaceSettingsView> {
  const row = await getOrCreateSettingsRow();
  return {
    active: row.active === 1,
    commissionRate: row.commissionRate,
    iyzicoApiKey: row.iyzicoApiKey,
    iyzicoSecretKey: row.iyzicoSecretKey,
    iyzicoBaseUrl: row.iyzicoBaseUrl,
    configured: isIyzicoConfigured({ apiKey: row.iyzicoApiKey, secretKey: row.iyzicoSecretKey, baseUrl: row.iyzicoBaseUrl }),
  };
}

/** Public, unauthenticated read - Askıda Kitap pages check this before ever
 * showing paid-listing/purchase UI, matching v1's real `get()` (no auth
 * required there either). Never returns the API keys. */
export async function getMarketplaceStatus(): Promise<{ active: boolean; commissionRate: number }> {
  const row = await getOrCreateSettingsRow();
  return { active: row.active === 1, commissionRate: row.commissionRate };
}

export async function getIyzicoConfig(): Promise<IyzicoConfig> {
  const row = await getOrCreateSettingsRow();
  return { apiKey: row.iyzicoApiKey, secretKey: row.iyzicoSecretKey, baseUrl: row.iyzicoBaseUrl };
}

export interface UpdateMarketplaceSettingsInput {
  active: boolean;
  commissionRate: number;
  iyzicoApiKey?: string | null;
  iyzicoSecretKey?: string | null;
  iyzicoBaseUrl?: string;
}

export async function updateMarketplaceSettings(input: UpdateMarketplaceSettingsInput): Promise<void> {
  if (input.commissionRate < 0 || input.commissionRate > 100) {
    throw new Error("Komisyon oranı 0-100 arasında olmalıdır.");
  }
  const row = await getOrCreateSettingsRow();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.update(marketplaceSettings).set({
    active: input.active ? 1 : 0,
    commissionRate: input.commissionRate,
    iyzicoApiKey: input.iyzicoApiKey !== undefined ? (input.iyzicoApiKey || null) : row.iyzicoApiKey,
    iyzicoSecretKey: input.iyzicoSecretKey !== undefined ? (input.iyzicoSecretKey || null) : row.iyzicoSecretKey,
    iyzicoBaseUrl: input.iyzicoBaseUrl || row.iyzicoBaseUrl,
    updatedDate: now,
  }).where(eq(marketplaceSettings.id, row.id));
}
