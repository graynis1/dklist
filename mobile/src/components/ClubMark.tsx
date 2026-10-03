import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";

const CLUB_HUES: [string, string][] = [
  ["#7d5411", "#c28d41"],
  ["#2f5754", "#5b8f8a"],
  ["#4a3b6b", "#7d6aa0"],
  ["#7a3434", "#b0605a"],
  ["#2f4d73", "#5d7fa8"],
  ["#4d5a26", "#7f8f4a"],
];

export const OFFICIAL_PREFIX = /^dklist\s*\|\s*/i;

export function clubDisplayName(name: string) {
  return name.replace(OFFICIAL_PREFIX, "").trim();
}

export function clubHue(name: string) {
  return hueFor(clubDisplayName(name));
}

function hueFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLUB_HUES[h % CLUB_HUES.length];
}

/** Placeholder club mark until clubs have their own uploaded logo. */
export function ClubMark({ name, size = 60 }: { name: string; size?: number }) {
  const clean = clubDisplayName(name);
  const initials = clean
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[\p{L}\d]/u.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase("tr-TR"))
    .join("");
  return (
    <LinearGradient colors={hueFor(clean)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.28, alignItems: "center", justifyContent: "center" }}>
      <ThemedText variant="title" color="#fff" style={{ fontSize: size * 0.36, letterSpacing: 0.5 }}>{initials || "K"}</ThemedText>
    </LinearGradient>
  );
}

