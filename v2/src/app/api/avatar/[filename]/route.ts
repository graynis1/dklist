import { NextRequest } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "avatars");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// The largest avatar render on the site is the profile header at `size-24`
// (96 CSS px), so 192 device px covers a 2x screen; everything else (feed
// chips, comment authors, header) is far smaller. Some stored avatars are
// full-size phone photos (one homepage avatar came back at 273 KiB);
// resized once here, then cached immutably.
const MAX_SIZE = 192;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  // User-controlled input (the stored filename came from an upload, but this
  // route parameter is still attacker-reachable directly) - basename() strips
  // any directory-traversal sequence, same guard as v1's ImageManager::
  // getImagePath(), so the real filesystem lookup never leaves UPLOAD_DIR.
  const safeName = path.basename(filename);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(UPLOAD_DIR, safeName));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  try {
    const out = await sharp(bytes)
      .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: "cover", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
}
