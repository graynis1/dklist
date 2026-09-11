import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { db } from "@/db";
import { book } from "@/db/schema";

// Ported from v1's CoverProxyController design: `book.image` (an Open Library or
// ISBN-guess URL) is NEVER exposed to any client, admin or public - every response
// that shows a cover points here instead. Resolves the real source at request time,
// caches the bytes to disk, and streams them back so the origin never appears in
// any network request the browser can see.
//
// Cache lives under the same `uploads/` root every other upload/cache path in
// this app uses (avatar/blog/badge/etc.) - NOT os.tmpdir(). A container's temp
// dir is ephemeral (wiped on restart/redeploy on most setups), which would
// silently defeat caching in production and re-hit the real Open Library/
// Amazon origin on every restart; `uploads/` is the directory this project
// already mounts as a persistent Docker volume for exactly this reason
// (matches v1's own dedicated `cover_cache_data` volume).
const CACHE_DIR = path.join(process.cwd(), "uploads", "cover-cache");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId) || bookId <= 0) {
    return placeholder();
  }

  const cachePath = path.join(CACHE_DIR, `${bookId}.jpg`);
  const cached = await tryReadCache(cachePath);
  if (cached) {
    return imageResponse(cached);
  }

  const [row] = await db
    .select({ image: book.image })
    .from(book)
    .where(eq(book.id, bookId))
    .limit(1);

  if (!row?.image) {
    return placeholder();
  }

  const fetched = await fetchIfPublicHost(row.image);
  if (!fetched) {
    return placeholder();
  }

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cachePath, fetched);

  return imageResponse(fetched);
}

async function tryReadCache(cachePath: string): Promise<Buffer | null> {
  try {
    return await readFile(cachePath);
  } catch {
    return null;
  }
}

function imageResponse(bytes: Buffer): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}

// Deliberately conservative: only ever fetches book.image, a value populated
// by our own bulk import / admin tooling, not user input - but still worth
// guarding against an accidentally-malformed or internal-looking URL, same
// spirit as the SSRF guard on v1's ImageController::uploadImageFromUrl (see
// PLAN.md), just simpler since the trust level of the input is much higher here.
async function fetchIfPublicHost(url: string): Promise<Buffer | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return null;
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) return null;

  try {
    const res = await fetch(parsed, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DKListCoverProxy/1.0)" },
    });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
}

// A 1x1 transparent PNG at 200, NOT a 404. PhotoBookCover swaps to the
// typeset jacket when its <img> loads with `naturalWidth <= 2` (this pixel)
// - equivalent to the old `onError` path but without a real 404, which
// Lighthouse's "errors-in-console" audit flags for the ~40-60% of the
// catalog whose stored source URL is dead (the coverage ceiling documented
// in PLAN.md). The pixel is `no-store` so a book that later gets a real
// cover isn't stuck showing the jacket.
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
function placeholder(): Response {
  return new Response(new Uint8Array(TRANSPARENT_PIXEL), {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
