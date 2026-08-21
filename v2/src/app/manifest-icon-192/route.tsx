import { ImageResponse } from "next/og";

export const contentType = "image/png";

/**
 * PWA manifest icon (192x192) - a fixed, stable route path so
 * src/app/manifest.ts can reference a known URL directly (Next's
 * generateImageMetadata multi-variant convention derives its own URLs,
 * which would need to be reverse-engineered/guessed at; a dedicated route
 * per size is simpler and unambiguous). Generated via ImageResponse
 * (Satori) rather than a hand-produced binary PNG - no logo image exists
 * in this design system yet, brand color/typography only.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3a1810",
          color: "#f2ded1",
          fontSize: 90,
          fontWeight: 600,
          fontFamily: "Georgia, serif",
        }}
      >
        DK
      </div>
    ),
    { width: 192, height: 192 },
  );
}
