import { Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { mediaUrl } from "@/lib/media";

const CLUB_HUES: [string, string][] = [
  ["#7d5411", "#c28d41"],
  ["#2f5754", "#5b8f8a"],
  ["#4a3b6b", "#7d6aa0"],
  ["#7a3434", "#b0605a"],
  ["#2f4d73", "#5d7fa8"],
  ["#4d5a26", "#7f8f4a"],
];

/** Same palette the web uses for the club color picker. */
export const CLUB_COLORS = ["#7d5411", "#2f5754", "#4a3b6b", "#7a3434", "#2f4d73", "#4d5a26", "#8a3b5f", "#1f1d1a"];

export const OFFICIAL_PREFIX = /^dklist\s*\|\s*/i;

export function clubDisplayName(name: string) {
  return name.replace(OFFICIAL_PREFIX, "").trim();
}

function hueFor(name: string): [string, string] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLUB_HUES[h % CLUB_HUES.length];
}

/** A chosen club color wins over the name-derived one. */
export function clubHue(name: string, color?: string | null): [string, string] {
  if (color) return [color, `${color}b3`];
  return hueFor(clubDisplayName(name));
}

/** The uploaded club logo, else the club initials on the club color. */
export function ClubMark({ name, size = 60, image, color }: { name: string; size?: number; image?: string | null; color?: string | null }) {
  const src = mediaUrl(image);
  if (src) {
    return <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: "#e9e5df" }} resizeMode="cover" />;
  }
  const initials = clubDisplayName(name)
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[\p{L}\d]/u.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase("tr-TR"))
    .join("");
  return (
    <LinearGradient colors={clubHue(name, color)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: "center", justifyContent: "center" }}>
      <ThemedText variant="title" color="#fff" style={{ fontSize: size * 0.36, letterSpacing: 0.5 }}>{initials || "K"}</ThemedText>
    </LinearGradient>
  );
}
