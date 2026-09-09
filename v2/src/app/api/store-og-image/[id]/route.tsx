import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { store } from "@/db/schema";
import { getInterFont } from "@/lib/og-font";

/**
 * Real customer report (2026-09-10): sharing an Askıda Kitap listing on
 * Facebook/WhatsApp showed the generic site logo, not the listing itself
 * ("İlan görseli ile beraber paylaş denilince paylaşılıyor olmalı? dklist.com
 * gibi geliyor"). Unlike books (mostly no real cover photo at all), a
 * listing's own uploaded photo IS a real, crawlable image already served at
 * /api/store-image/[filename] - the page's generateMetadata uses that
 * directly when present. This generated card is only the fallback for the
 * (real, and common - free listings don't require a photo) case where a
 * listing has no photo at all, same "typeset jacket" idea as book-og-image,
 * adapted for price/listing-type instead of author/score.
 */
const TONES: { bg: string; fg: string }[] = [
  { bg: "#5c2a24", fg: "#f5ede3" },
  { bg: "#33465c", fg: "#eef0f5" },
  { bg: "#b8873f", fg: "#2b2013" },
  { bg: "#4b6b52", fg: "#f0f3ee" },
  { bg: "#2b2723", fg: "#f0e9de" },
  { bg: "#5c6b3a", fg: "#f2f0e6" },
  { bg: "#a8532e", fg: "#fdf6f0" },
  { bg: "#356b6b", fg: "#eef5f3" },
  { bg: "#5c3355", fg: "#f5ecf2" },
  { bg: "#c99a2e", fg: "#2b2311" },
];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const storeId = Number(id);
  if (!Number.isInteger(storeId)) {
    return new Response("Invalid id", { status: 400 });
  }

  const [row] = await db
    .select({ id: store.id, title: store.title, price: store.price, listingType: store.listingType })
    .from(store)
    .where(eq(store.id, storeId))
    .limit(1);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const tone = TONES[row.id % TONES.length];
  const normalizedTitle = row.title.normalize("NFC");
  const displayTitle = normalizedTitle.length > 90 ? `${normalizedTitle.slice(0, 90)}...` : normalizedTitle;
  const priceText =
    row.listingType === "free" || row.price == null
      ? "Askıda (Ücretsiz)"
      : `${Number(row.price).toLocaleString("tr-TR")} TL`;
  const fontData = await getInterFont(700);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: tone.bg,
          color: tone.fg,
          fontFamily: "Inter",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, opacity: 0.7 }}>DKList Askıda Kitap</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>{displayTitle}</div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              backgroundColor: "rgba(255,255,255,0.16)",
              borderRadius: 12,
              padding: "10px 20px",
              width: "fit-content",
            }}
          >
            {priceText}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] },
  );
}
