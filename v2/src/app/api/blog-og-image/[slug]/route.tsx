import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { blog } from "@/db/schema";
import { blogImageUrl } from "@/db/queries/blog";
import { getInterFont } from "@/lib/og-font";

/**
 * Real customer report (2026-09-21): sharing a blog post to X/Twitter shows
 * no image, even though Facebook/WhatsApp show the cover fine - the blog
 * page passes the raw uploaded cover straight through as og:image
 * (`blog/[slug]/page.tsx`'s `generateMetadata`), whatever aspect ratio/
 * dimensions the author happened to upload. X's card validator is stricter
 * about minimum size/aspect than Facebook/WhatsApp's, so an odd-shaped
 * cover can silently fail only there. Same fix as the Askıda Kitap listing
 * card (`store-og-image`): always generate a normalized 1200x630 card that
 * embeds the real cover (when there is one) at a fixed, safe crop, instead
 * of passing the raw upload through.
 */
const TONES: { bg: string; fg: string }[] = [
  { bg: "#2b2723", fg: "#f0e9de" },
  { bg: "#33465c", fg: "#eef0f5" },
  { bg: "#5c3355", fg: "#f5ecf2" },
  { bg: "#356b6b", fg: "#eef5f3" },
  { bg: "#5c2a24", fg: "#f5ede3" },
];

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [row] = await db
    .select({ id: blog.id, title: blog.title, image: blog.image })
    .from(blog)
    .where(eq(blog.slug, slug))
    .limit(1);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const rawImage = blogImageUrl(row.image);
  // Satori (next/og's renderer) fetches <img> sources itself, at request
  // time - it has no notion of "relative to this site", so a same-origin
  // /api/blog-image/... path must be made absolute first (same fix as
  // store-og-image's own photoUrl).
  const photoUrl = rawImage && !/^https?:\/\//i.test(rawImage) ? `${new URL(request.url).origin}${rawImage}` : rawImage;

  const tone = TONES[row.id % TONES.length];
  const normalizedTitle = row.title.normalize("NFC");
  const displayTitle = normalizedTitle.length > 90 ? `${normalizedTitle.slice(0, 90)}...` : normalizedTitle;
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
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, opacity: 0.7 }}>DKList Blog</div>
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>{displayTitle}</div>
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
