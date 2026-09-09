import { ImageResponse } from "next/og";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserTotalPoints } from "@/db/queries/points";
import { getInterFont } from "@/lib/og-font";

/**
 * Real customer report (2026-09-09): sharing a "puan kartı"/reading-goal
 * Canvas card (PointsShareCard, ReadingGoalShareCard, etc.) to Facebook
 * showed either a blank preview or the bare generic site logo - those
 * cards' `ShareButton` links to the profile page (a Canvas drawing can't
 * be a crawlable og:image, only a real URL can), and the profile page's
 * own og:image was just DEFAULT_OG_IMAGE (see seo.ts) with nothing
 * specific to the person or their achievement. Same fix as the book-cover
 * case: a real, generated, crawlable image - username + lifetime points,
 * a genuinely more meaningful preview than a bare app icon.
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

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const [row] = await db.select({ id: user.id, username: user.username }).from(user).where(eq(user.username, username)).limit(1);
  if (!row) {
    return new Response("Not found", { status: 404 });
  }

  const [points, fontData] = await Promise.all([getUserTotalPoints(row.id), getInterFont(700)]);
  const tone = TONES[row.id % TONES.length];

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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 700 }}>{`@${row.username}`}</div>
          <div style={{ fontSize: 34, fontWeight: 700, opacity: 0.85 }}>{`${points} puan kazandı`}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }] },
  );
}
