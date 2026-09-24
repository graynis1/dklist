import { Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/useTheme";

/** Deterministic per-id gradient pick, matching the reference's identity
 * system ("her kullanıcı için tutarlı bir kimlik") - the same id always
 * gets the same gradient, no randomness, same idea as the web app's own
 * toneForId() (a different palette, but the same "consistent per id, not
 * random per render" contract). */
function toneForId(id: number, pairs: [string, string][]): [string, string] {
  return pairs[Math.abs(id) % pairs.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  id,
  name,
  imageUrl,
  size = 36,
}: {
  id: number;
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const { colors, fontFamily } = useTheme();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const [from, to] = toneForId(id, [
    [colors.accent400, colors.accent700],
    [colors.neutral400, colors.neutral700],
    [colors.accent300, colors.accent600],
  ]);

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.headingSemibold,
          fontSize: Math.max(10, size * 0.34),
          color: "#ffffff",
        }}
      >
        {initialsOf(name)}
      </Text>
    </LinearGradient>
  );
}
