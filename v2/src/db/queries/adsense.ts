import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adsenseSetting, adsensePlacement } from "@/db/schema";
import { AD_PLACEMENTS, type AdPlacementId } from "@/lib/ad-placements";

/**
 * Real Google AdSense integration, admin-managed (customer's ask,
 * 2026-09-02), alongside (not replacing) the existing direct/personal ad
 * system in advertisements.ts. Deliberately inert by default: `enabled`
 * starts false and `publisherId` starts null, so AdSlot never loads
 * Google's script or renders an ad unit until a real, approved AdSense
 * account's details are entered here - a fake/placeholder publisher id
 * would just show broken/blank boxes to real visitors, so this must stay
 * off until it's genuinely real.
 */
export interface AdSenseSettings {
  publisherId: string | null;
  enabled: boolean;
}

export async function getAdSenseSettings(): Promise<AdSenseSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("adsense-settings");

  const [row] = await db.select({ publisherId: adsenseSetting.publisherId, enabled: adsenseSetting.enabled }).from(adsenseSetting).where(eq(adsenseSetting.id, 1)).limit(1);
  return { publisherId: row?.publisherId ?? null, enabled: Boolean(row?.enabled) };
}

export async function updateAdSenseSettings(publisherId: string, enabled: boolean): Promise<void> {
  const trimmed = publisherId.trim();
  await db
    .insert(adsenseSetting)
    .values({ id: 1, publisherId: trimmed || null, enabled: enabled ? 1 : 0 })
    .onDuplicateKeyUpdate({ set: { publisherId: trimmed || null, enabled: enabled ? 1 : 0 } });
  updateTag("adsense-settings");
}

export async function getAdSenseSlot(placement: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("adsense-placements");

  const [row] = await db.select({ slotId: adsensePlacement.slotId }).from(adsensePlacement).where(eq(adsensePlacement.placement, placement)).limit(1);
  return row?.slotId?.trim() || null;
}

export interface AdSensePlacementRow {
  placement: AdPlacementId;
  label: string;
  slotId: string | null;
}

/** Every known placement (see ad-placements.ts) with its current AdSense
 * slot id, if any - powers the admin settings list so every real
 * placement is always visible, not just the ones that already have a row. */
export async function getAdSensePlacements(): Promise<AdSensePlacementRow[]> {
  const rows = await db.select({ placement: adsensePlacement.placement, slotId: adsensePlacement.slotId }).from(adsensePlacement);
  const slotByPlacement = new Map(rows.map((r) => [r.placement, r.slotId]));
  return AD_PLACEMENTS.map((p) => ({ placement: p.id, label: p.label, slotId: slotByPlacement.get(p.id) ?? null }));
}

export async function setAdSensePlacementSlot(placement: string, slotId: string): Promise<void> {
  const trimmed = slotId.trim();
  await db
    .insert(adsensePlacement)
    .values({ placement, slotId: trimmed || null })
    .onDuplicateKeyUpdate({ set: { slotId: trimmed || null } });
  updateTag("adsense-placements");
}
