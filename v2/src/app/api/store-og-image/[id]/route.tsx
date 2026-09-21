import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { store, storePicture } from "@/db/schema";
import { getInterFont } from "@/lib/og-font";

/**
 * Real customer report (2026-09-10): sharing an Askıda Kitap listing on
 * Facebook/WhatsApp showed the generic site logo, not the listing itself.
 * Originally fixed by using the listing's own uploaded photo directly as
 * og:image when present, with this generated title+price card only as the
 * no-photo fallback.
 *
 * Follow-up real customer report (2026-09-21): that "use the raw photo
 * directly" fix was itself wrong for the common case (most listings DO have
 * a photo) - a raw seller-uploaded photo is whatever aspect ratio their
 * phone shot it in, never Facebook/WhatsApp's expected 1200x630, so it got
 * cropped oddly ("büyük kalıyor bir kısmı görünmüyor") AND carried no price
 * text at all, since it's just the bare photo. Now this generated card is
 * ALWAYS used (see the page's generateMetadata) and embeds the listing's own
 * first photo as a properly `objectFit: "cover"`-cropped panel alongside the
 * title/price text, so the real photo still shows but at the right ratio,
 * with the price never missing again.
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const [picture] = await db
    .select({ imageName: storePicture.imageName })
    .from(storePicture)
    .where(eq(storePicture.advertId, storeId))
    .limit(1);
  // Satori (next/og's renderer) fetches <img> sources itself, at request
  // time - it has no notion of "relative to this site", so the URL must be
  // absolute. Same-looking bug class as the profile-og-image card would hit
  // if it ever embedded a photo - built correctly here from day one.
  const photoUrl =
    picture?.imageName && !/^https?:\/\//i.test(picture.imageName)
      ? `${new URL(request.url).origin}/api/store-image/${picture.imageName}`
      : picture?.imageName ?? null;

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
          backgroundColor: tone.bg,
          color: tone.fg,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            width: photoUrl ? "58%" : "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, opacity: 0.7 }}>DKList Askıda Kitap</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{displayTitle}</div>
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
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            width={504}
            height={630}
            style={{ width: "42%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] },
  );
}
