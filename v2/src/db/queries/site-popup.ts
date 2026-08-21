import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sitePopup } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "site-popup");

function deletePopupImageFile(filename: string): Promise<void> {
  return unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}

export interface SitePopupView {
  active: boolean;
  title: string | null;
  content: string | null;
  image: string | null;
  link: string | null;
}

async function getRow() {
  const [row] = await db.select().from(sitePopup).limit(1);
  return row ?? null;
}

/**
 * Ports v1's real SitePopupController - a single-row, admin-configurable
 * announcement popup shown once per browser session (not a real ad unit,
 * no AdSense involved - a generic promo/announcement slot). Public read
 * (no auth) since every page needs to check this on first load.
 */
export async function getSitePopup(): Promise<SitePopupView> {
  const row = await getRow();
  if (!row) return { active: false, title: null, content: null, image: null, link: null };
  return { active: row.active === 1, title: row.title, content: row.content, image: row.image, link: row.link };
}

export interface UpdateSitePopupInput {
  active: boolean;
  title?: string;
  content?: string;
  link?: string;
  image?: File;
}

export async function updateSitePopup(input: UpdateSitePopupInput): Promise<void> {
  const row = await getRow();

  let imageFilename: string | null = row?.image ?? null;
  if (input.image && input.image.size > 0) {
    imageFilename = await saveUploadedImage("site-popup", input.image);
    if (row?.image) await deletePopupImageFile(row.image);
  }

  const values = {
    active: input.active ? 1 : 0,
    title: input.title?.trim() || null,
    content: input.content?.trim() || null,
    link: input.link?.trim() || null,
    image: imageFilename,
  };

  if (row) {
    await db.update(sitePopup).set(values).where(eq(sitePopup.id, row.id));
  } else {
    await db.insert(sitePopup).values(values);
  }
}
