import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { advertisement } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";
import { isUserPremium } from "@/db/queries/premium";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "advertisement");

function deleteAdImageFile(filename: string): Promise<void> {
  return unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}

export interface AdView {
  id: number;
  image: string;
  mobileImage: string | null;
  linkUrl: string | null;
}

/**
 * Ad-free is the one premium benefit the customer's own notes actually
 * named - every ad-rendering call site should go through this (checks
 * premium status first) rather than each page re-implementing the gate.
 * Returns null for a signed-out visitor's isPremium check (never premium).
 *
 * `contentLanguage` (optional, e.g. the book's `lang` on a book page) is
 * the content-language ad-targeting mechanism the customer posed as an open
 * question rather than an answer (see migration 0013's doc comment for why
 * this is content-language, not visitor-GEO, targeting). An ad with
 * `language` set only shows in a matching-language context; a NULL-language
 * ad ("all languages") always shows. A placement called with no
 * `contentLanguage` (e.g. the homepage, which has no single content
 * language) only ever gets a NULL-language ad, since there's no context to
 * match a targeted one against.
 */
export async function getActiveAd(
  placement: string,
  viewerUserId: number | null,
  contentLanguage?: string,
): Promise<AdView | null> {
  if (viewerUserId && (await isUserPremium(viewerUserId))) return null;

  const languageCondition = contentLanguage
    ? or(eq(advertisement.language, contentLanguage), isNull(advertisement.language))
    : isNull(advertisement.language);

  const [row] = await db.select({ id: advertisement.id, image: advertisement.image, mobileImage: advertisement.mobileImage, linkUrl: advertisement.linkUrl })
    .from(advertisement)
    .where(and(eq(advertisement.placement, placement), eq(advertisement.active, 1), languageCondition))
    // A language-matched ad wins over a generic (NULL) one when both exist
    // for the same placement + context.
    .orderBy(contentLanguage ? asc(sql`${advertisement.language} IS NULL`) : asc(advertisement.sortOrder), asc(advertisement.sortOrder))
    .limit(1);

  if (row) {
    // Fire-and-forget - an impression miscount is not worth blocking or
    // slowing down the actual page render for.
    db.update(advertisement).set({ impressions: sql`${advertisement.impressions} + 1` }).where(eq(advertisement.id, row.id)).catch(() => {});
  }

  return row ?? null;
}

/** /api/ad-click/[id] - increments the click counter then the caller
 * redirects to the ad's real linkUrl. Returns null if the ad doesn't exist
 * or has no link (nothing to redirect to). */
export async function recordAdClick(adId: number): Promise<string | null> {
  const [row] = await db.select({ linkUrl: advertisement.linkUrl }).from(advertisement).where(eq(advertisement.id, adId)).limit(1);
  if (!row?.linkUrl) return null;
  await db.update(advertisement).set({ clicks: sql`${advertisement.clicks} + 1` }).where(eq(advertisement.id, adId));
  return row.linkUrl;
}

export interface AdAdminListItem {
  id: number;
  placement: string;
  language: string | null;
  image: string;
  mobileImage: string | null;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
  impressions: number;
  clicks: number;
}

export async function getAdAdminList(): Promise<AdAdminListItem[]> {
  const rows = await db.select().from(advertisement).orderBy(asc(advertisement.placement), asc(advertisement.sortOrder));
  return rows.map((r) => ({ id: r.id, placement: r.placement, language: r.language, image: r.image, mobileImage: r.mobileImage, linkUrl: r.linkUrl, active: r.active === 1, sortOrder: r.sortOrder, impressions: r.impressions, clicks: r.clicks }));
}

export interface CreateAdInput {
  placement: string;
  language?: string;
  image: File;
  /** Optional dedicated mobile-sized creative - see migration 0036's doc
   * comment for why a flat image with baked-in text needs one. */
  mobileImage?: File;
  linkUrl?: string;
  sortOrder?: number;
}

export async function createAd(input: CreateAdInput): Promise<void> {
  const placement = input.placement.trim();
  if (!placement) throw new Error("Yerleşim adı zorunludur.");
  if (input.image.size === 0) throw new Error("Bir görsel yüklemelisiniz.");

  const filename = await saveUploadedImage("advertisement", input.image);
  const mobileFilename = input.mobileImage && input.mobileImage.size > 0 ? await saveUploadedImage("advertisement", input.mobileImage) : null;
  await db.insert(advertisement).values({
    placement,
    language: input.language?.trim() || null,
    image: filename,
    mobileImage: mobileFilename,
    linkUrl: input.linkUrl?.trim() || null,
    active: 1,
    sortOrder: input.sortOrder ?? 0,
    createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
  });
}

export async function toggleAdActive(adId: number): Promise<void> {
  const [row] = await db.select({ active: advertisement.active }).from(advertisement).where(eq(advertisement.id, adId)).limit(1);
  if (!row) throw new Error("Reklam bulunamadı.");
  await db.update(advertisement).set({ active: row.active === 1 ? 0 : 1 }).where(eq(advertisement.id, adId));
}

export async function deleteAd(adId: number): Promise<void> {
  const [row] = await db.select({ image: advertisement.image, mobileImage: advertisement.mobileImage }).from(advertisement).where(eq(advertisement.id, adId)).limit(1);
  if (!row) throw new Error("Reklam bulunamadı.");
  await db.delete(advertisement).where(eq(advertisement.id, adId));
  await deleteAdImageFile(row.image);
  if (row.mobileImage) await deleteAdImageFile(row.mobileImage);
}

/** Lets an admin add/replace just the mobile creative on an existing ad
 * without recreating the whole row. */
export async function setAdMobileImage(adId: number, mobileImage: File): Promise<void> {
  const [row] = await db.select({ mobileImage: advertisement.mobileImage }).from(advertisement).where(eq(advertisement.id, adId)).limit(1);
  if (!row) throw new Error("Reklam bulunamadı.");
  if (mobileImage.size === 0) throw new Error("Bir görsel yüklemelisiniz.");

  const filename = await saveUploadedImage("advertisement", mobileImage);
  await db.update(advertisement).set({ mobileImage: filename }).where(eq(advertisement.id, adId));
  if (row.mobileImage) await deleteAdImageFile(row.mobileImage);
}
