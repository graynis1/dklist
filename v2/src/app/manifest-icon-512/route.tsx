import { ImageResponse } from "next/og";

export const contentType = "image/png";

/** PWA manifest icon (512x512) - see manifest-icon-192/route.tsx's doc
 * comment for why this is a dedicated fixed-path route per size. */
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
          fontSize: 240,
          fontWeight: 600,
          fontFamily: "Georgia, serif",
        }}
      >
        DK
      </div>
    ),
    { width: 512, height: 512 },
  );
}
