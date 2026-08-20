import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import os from "node:os";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { db } from "@/db";
import { book } from "@/db/schema";

// Ported from v1's CoverProxyController design: `book.image` (an Open Library or
// ISBN-guess URL) is NEVER exposed to any client, admin or public - every response
// that shows a cover points here instead. Resolves the real source at request time,
// caches the bytes to disk, and streams them back so the origin never appears in
// any network request the browser can see.
const CACHE_DIR = path.join(os.tmpdir(), "dklist-v2-cover-cache");

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

// A simple typeset placeholder (matches the BookCover component's "no photo"
// design language) instead of a broken-image icon when a book has no cover URL
// or the fetch failed - roughly 50% of the real catalog has none, per PLAN.md's
// data-quality notes, so this is the common case, not an edge case.
function placeholder(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="oklch(0.94 0.02 55)" />
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, serif" font-size="20" fill="oklch(0.48 0.02 55)">Kapak Yok</text>
  </svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
