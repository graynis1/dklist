import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { and, asc, eq } from "drizzle-orm";
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
  linkUrl: string | null;
}

/**
 * Ad-free is the one premium benefit the customer's own notes actually
 * named - every ad-rendering call site should go through this (checks
 * premium status first) rather than each page re-implementing the gate.
 * Returns null for a signed-out visitor's isPremium check (never premium).
 */
export async function getActiveAd(placement: string, viewerUserId: number | null): Promise<AdView | null> {
  if (viewerUserId && (await isUserPremium(viewerUserId))) return null;

  const [row] = await db.select({ id: advertisement.id, image: advertisement.image, linkUrl: advertisement.linkUrl })
    .from(advertisement)
    .where(and(eq(advertisement.placement, placement), eq(advertisement.active, 1)))
    .orderBy(asc(advertisement.sortOrder))
    .limit(1);

  return row ?? null;
}

export interface AdAdminListItem {
  id: number;
  placement: string;
  image: string;
  linkUrl: string | null;
  active: boolean;
  sortOrder: number;
}

export async function getAdAdminList(): Promise<AdAdminListItem[]> {
  const rows = await db.select().from(advertisement).orderBy(asc(advertisement.placement), asc(advertisement.sortOrder));
  return rows.map((r) => ({ id: r.id, placement: r.placement, image: r.image, linkUrl: r.linkUrl, active: r.active === 1, sortOrder: r.sortOrder }));
}

export interface CreateAdInput {
  placement: string;
  image: File;
  linkUrl?: string;
  sortOrder?: number;
}

export async function createAd(input: CreateAdInput): Promise<void> {
  const placement = input.placement.trim();
  if (!placement) throw new Error("Yerleşim adı zorunludur.");
  if (input.image.size === 0) throw new Error("Bir görsel yüklemelisiniz.");

  const filename = await saveUploadedImage("advertisement", input.image);
  await db.insert(advertisement).values({
    placement,
    image: filename,
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
  const [row] = await db.select({ image: advertisement.image }).from(advertisement).where(eq(advertisement.id, adId)).limit(1);
  if (!row) throw new Error("Reklam bulunamadı.");
  await db.delete(advertisement).where(eq(advertisement.id, adId));
  await deleteAdImageFile(row.image);
}
