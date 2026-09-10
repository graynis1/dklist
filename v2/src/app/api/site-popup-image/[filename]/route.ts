import { NextRequest } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "site-popup");

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

// The popup renders inside a `max-w-sm` (~384 CSS px) modal, so ~800 device
// px covers even a 2x screen. Old imported popup images are ~1200px+ and
// were shipped at native size (Lighthouse "improve image delivery",
// ~90 KiB wasted). Resized once here, then cached immutably.
const MAX_WIDTH = 800;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const safeName = path.basename(filename);
  const ext = safeName.split(".").pop()?.toLowerCase() ?? "";
  if (!CONTENT_TYPES[ext]) {
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
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // sharp couldn't process it - serve the raw bytes rather than 404
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
}
