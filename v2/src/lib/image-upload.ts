import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";

/**
 * Shared local-disk image save helper - v1's ImageManager::saveImage() is
 * used the same way across every upload site (avatar, blog, store listing
 * photos, etc.), a single implementation each caller passes its own
 * subdirectory to, rather than duplicating the magic-byte/size validation
 * per feature.
 */
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

function looksLikeImage(bytes: Buffer): boolean {
  if (bytes.length < 12) return false;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true; // PNG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true; // JPEG
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return true; // WEBP
  return false;
}

export async function saveUploadedImage(subdir: string, file: File): Promise<string> {
  const originalExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(originalExt)) {
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

/** Best-effort delete (a missing file is not an error worth surfacing) -
 * most existing upload features (ads, store listings) hand-roll this exact
 * one-liner per feature; kept here too so a new one doesn't have to. */
export async function deleteUploadedImage(subdir: string, filename: string): Promise<void> {
  await unlink(path.join(process.cwd(), "uploads", subdir, filename)).catch(() => {});
}
