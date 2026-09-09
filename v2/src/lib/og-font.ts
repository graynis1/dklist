import "server-only";

/**
 * Shared by every `next/og` ImageResponse route (book covers, profile
 * cards, ...) - satori's built-in default font has no Turkish glyph
 * coverage (confirmed live: "ş" broke and ate the following space).
 * Fetches the real, CURRENT font URL from Google's own CSS API rather
 * than a hand-copied gstatic URL, which 404'd within the same session
 * (those versioned URLs aren't stable long-term) and crashed the route
 * with "Unsupported OpenType signature" (the 404 HTML page fed to satori
 * as if it were font bytes). Cached per server process, not per-request.
 */
const fontCache = new Map<number, Promise<ArrayBuffer>>();

export async function getInterFont(weight: 400 | 700 = 700): Promise<ArrayBuffer> {
  const cached = fontCache.get(weight);
  if (cached) return cached;

  const promise = (async () => {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&display=swap`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    }).then((r) => r.text());
    const match = css.match(/src: url\(([^)]+)\) format\('truetype'\)/);
    if (!match) throw new Error("Could not resolve Inter font URL from Google Fonts CSS");
    const fontRes = await fetch(match[1]);
    return fontRes.arrayBuffer();
  })();

  fontCache.set(weight, promise);
  return promise;
}
