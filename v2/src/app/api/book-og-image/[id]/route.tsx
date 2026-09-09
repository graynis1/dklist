import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { book, writer, writerBook } from "@/db/schema";
import { getInterFont } from "@/lib/og-font";

/**
 * Real customer report (2026-09-09): sharing a book with no real cover
 * photo (the ~55-60% of the catalog with no source image at all - see
 * project_dklist_cover_image_system memory) showed the bare site logo on
 * Facebook/social previews, giving zero visual distinction between one
 * book and another (or the homepage itself). The site's own UI never has
 * this problem - `BookCover` already renders a real typeset "jacket"
 * (title/author/color tone) for exactly this case - but that's a React
 * component, not a fetchable image URL a social crawler can use. This is
 * the same jacket design, rendered as a real PNG via `next/og`'s
 * ImageResponse (satori) so it CAN be a crawlable og:image.
 *
 * Hex tones below approximate (not byte-identical to, satori's CSS
 * support doesn't include oklch()) `book-cover.tsx`'s TONE_STYLE palette,
 * same 10-tone/`% 10` assignment so a given book still gets a consistent,
 * recognizable color both on-site and in a shared preview.
 */
const TONES: { bg: string; fg: string }[] = [
  { bg: "#5c2a24", fg: "#f5ede3" }, // oxblood
  { bg: "#33465c", fg: "#eef0f5" }, // dusk
  { bg: "#b8873f", fg: "#2b2013" }, // ochre
  { bg: "#4b6b52", fg: "#f0f3ee" }, // sage
  { bg: "#2b2723", fg: "#f0e9de" }, // ink
  { bg: "#5c6b3a", fg: "#f2f0e6" }, // olive
  { bg: "#a8532e", fg: "#fdf6f0" }, // terracotta
  { bg: "#356b6b", fg: "#eef5f3" }, // teal
  { bg: "#5c3355", fg: "#f5ecf2" }, // plum
  { bg: "#c99a2e", fg: "#2b2311" }, // mustard
];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) {
    return new Response("Invalid id", { status: 400 });
  }

  const [bookRow] = await db.select({ id: book.id, name: book.name }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!bookRow) {
    return new Response("Not found", { status: 404 });
  }

  const writerRows = await db.select({ name: writer.name }).from(writerBook).innerJoin(writer, eq(writerBook.writerId, writer.id)).where(eq(writerBook.bookId, bookId));
  const authorText = writerRows.map((w) => w.name).join(", ") || "Yazar bilinmiyor";
  const tone = TONES[bookRow.id % TONES.length];
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
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2, opacity: 0.7 }}>DKList</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.15, maxHeight: 280, overflow: "hidden" }}>
            {bookRow.name}
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.85 }}>{authorText}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] },
  );
}
