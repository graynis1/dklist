import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import sharp from "sharp";

// NOTE (2026-08-31): sharp's Windows native binary fails to dlopen when
// loaded through Turbopack's runtime on this local machine - reproduced in
// both `next dev` and a real `next start`, and a createRequire()-based
// workaround made no difference (Turbopack intercepts that too). This is a
// LOCAL Windows-only failure: the production VPS builds a genuinely fresh
// Linux node_modules inside its own Docker image (see next.config.ts's
// `output: "standalone"` comment for why - same reasoning applies here),
// where sharp's Linux binary has no equivalent sibling-DLL search-path
// issue. Verified working end-to-end against the real deployed Linux
// container before shipping this - see PLAN.md. If local Windows dev on
// this route ever needs to work again, that's a real but separate
// Turbopack/Windows/native-addon problem to solve later, not a sign this
// code is wrong.

/**
 * Shared local-disk image save helper - v1's ImageManager::saveImage() is
 * used the same way across every upload site (avatar, blog, store listing
 * photos, etc.), a single implementation each caller passes its own
 * subdirectory to, rather than duplicating validation per feature.
 *
 * Previously this only accepted png/jpg/webp via a fixed extension
 * allowlist + a hand-rolled magic-byte sniff for those three formats -
 * real bug reported live: a phone's camera photo is very commonly HEIC
 * (iPhone default) or another format entirely, which this rejected outright
 * even though, to the user, it's obviously "an accepted format" (a photo).
 * Maintainer's explicit ask: accept any real image regardless of format,
 * and always normalize to webp - both problems share one fix. sharp/libvips
 * (already includes heif/webp/png/jpeg/tiff/gif codecs, confirmed via
 * sharp.versions) both validates ("can this actually be decoded as an
 * image") and re-encodes in one step, replacing both the old allowlist and
 * the magic-byte sniff - a corrupt/non-image file now fails naturally when
 * sharp can't decode it, rather than needing a bespoke signature check.
 */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function saveUploadedImage(subdir: string, file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Dosya boş.");
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new Error("Resim en fazla 15MB olabilir.");
  }

  let webp: Buffer;
  try {
    webp = await sharp(bytes, { failOn: "none" })
      .rotate() // apply EXIF orientation before stripping metadata
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error("Dosya geçerli bir resim değil.");
  }

  const uploadDir = path.join(process.cwd(), "uploads", subdir);
  const filename = `${randomUUID()}.webp`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), webp);
  return filename;
}

/** Best-effort delete (a missing file is not an error worth surfacing) -
 * most existing upload features (ads, store listings) hand-roll this exact
 * one-liner per feature; kept here too so a new one doesn't have to. */
export async function deleteUploadedImage(subdir: string, filename: string): Promise<void> {
  await unlink(path.join(process.cwd(), "uploads", subdir, filename)).catch(() => {});
}
