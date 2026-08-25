import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { ALLOWED_IMAGE_EXTENSIONS, looksLikeImage } from "@/lib/image-validation";

// v1's ImageManager falls back to local-disk storage (an `/uploads`
// directory + `/image/{name}` route) whenever Cloudinary isn't configured -
// confirmed the reference backend's own .env has all CLOUDINARY_* vars
// empty, so that's the actual path exercised today, not the Cloudinary one.
// Matched here rather than reaching for a new paid service, consistent with
// the standing "no paid services" constraint. Persistent (not tmpdir, unlike
// the book-cover cache) - losing a real user's uploaded avatar would be
// actual data loss, not just a cache miss.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

export async function uploadAvatar(userId: number, file: File): Promise<string> {
  const originalExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_EXTENSIONS.has(originalExt)) {
    throw new Error("Sadece .png, .jpg ve .webp uzantılı resim dosyaları kabul edilir.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeImage(bytes)) {
    throw new Error("Dosya geçerli bir resim değil.");
  }
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Resim en fazla 5MB olabilir.");
  }

  const [row] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1);

  const filename = `${randomUUID()}.${originalExt}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  await db.update(user).set({ image: filename }).where(eq(user.id, userId));

  if (row?.image) {
    await unlink(path.join(UPLOAD_DIR, row.image)).catch(() => {});
  }

  return filename;
}

export function avatarUrl(image: string | null): string | null {
  return image ? `/api/avatar/${image}` : null;
}
