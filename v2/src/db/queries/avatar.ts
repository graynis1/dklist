import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { saveUploadedImage } from "@/lib/image-upload";

// v1's ImageManager falls back to local-disk storage (an `/uploads`
// directory + `/image/{name}` route) whenever Cloudinary isn't configured -
// confirmed the reference backend's own .env has all CLOUDINARY_* vars
// empty, so that's the actual path exercised today, not the Cloudinary one.
// Matched here rather than reaching for a new paid service, consistent with
// the standing "no paid services" constraint. Persistent (not tmpdir, unlike
// the book-cover cache) - losing a real user's uploaded avatar would be
// actual data loss, not just a cache miss.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

/**
 * Real customer-reported bug: "profil resmi ekleyemedim, telden bakayım
 * dedim" (couldn't add a profile picture, tried from my phone). Root cause:
 * this had its OWN duplicated fixed-extension allowlist + magic-byte sniff,
 * completely separate from saveUploadedImage() in image-upload.ts - so the
 * any-format-to-webp fix built for the rest of the site (askıda kitap,
 * blog, badges, etc.) never touched avatar uploads at all. A phone camera
 * photo (very commonly HEIC on iPhone) was still rejected outright here.
 * Fixed by routing through the same shared, sharp-based upload path -
 * every filename this writes is now genuinely `.webp`, matching every
 * other upload feature site-wide.
 */
export async function uploadAvatar(userId: number, file: File): Promise<string> {
  const [row] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1);

  const filename = await saveUploadedImage("avatars", file);
  await db.update(user).set({ image: filename }).where(eq(user.id, userId));

  if (row?.image) {
    await unlink(path.join(UPLOAD_DIR, row.image)).catch(() => {});
  }

  return filename;
}

export function avatarUrl(image: string | null): string | null {
  return image ? `/api/avatar/${image}` : null;
}
