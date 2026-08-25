import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { ALLOWED_IMAGE_EXTENSIONS, looksLikeImage } from "@/lib/image-validation";

/**
 * Shared local-disk image save helper - v1's ImageManager::saveImage() is
 * used the same way across every upload site (avatar, blog, store listing
 * photos, etc.), a single implementation each caller passes its own
 * subdirectory to, rather than duplicating the magic-byte/size validation
 * per feature.
 */

export async function saveUploadedImage(subdir: string, file: File): Promise<string> {
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

  const uploadDir = path.join(process.cwd(), "uploads", subdir);
  const filename = `${randomUUID()}.${originalExt}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return filename;
}
