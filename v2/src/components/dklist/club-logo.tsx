/**
 * A club's mark: its uploaded logo, else initials on a gradient in the
 * club's accent color (or a stable color derived from its name). Mirrors
 * the mobile ClubMark so a club looks the same on web and app.
 */
const HUES: [string, string][] = [
  ["#7d5411", "#c28d41"],
  ["#2f5754", "#5b8f8a"],
  ["#4a3b6b", "#7d6aa0"],
  ["#7a3434", "#b0605a"],
  ["#2f4d73", "#5d7fa8"],
  ["#4d5a26", "#7f8f4a"],
];

export const CLUB_COLORS = ["#7d5411", "#2f5754", "#4a3b6b", "#7a3434", "#2f4d73", "#4d5a26", "#8a3b5f", "#1f1d1a"];

export function clubDisplayName(name: string) {
  return name.replace(/^dklist\s*\|\s*/i, "").trim();
}

export function clubGradient(name: string, color: string | null): [string, string] {
  if (color) return [color, `${color}b3`];
  let h = 0;
  for (const ch of clubDisplayName(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function ClubLogo({ name, image, color, size = 56, className = "" }: { name: string; image: string | null; color: string | null; size?: number; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={clubDisplayName(name)} width={size} height={size} className={`shrink-0 object-cover ${className}`} style={{ width: size, height: size, borderRadius: size * 0.28 }} />;
  }
  const [a, b] = clubGradient(name, color);
  const initials = clubDisplayName(name)
    .split(/\s+/)
    .filter((w) => w && /[\p{L}\d]/u.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase("tr-TR"))
    .join("");
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center font-semibold text-white ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.28, background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.36 }}
    >
      {initials || "K"}
    </span>
  );
}
