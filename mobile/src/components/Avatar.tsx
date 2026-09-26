import { Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/useTheme";
import { API_BASE_URL } from "@/api/config";

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

/**
 * Mirrors v2's own `avatarUrl()` (src/lib/image-urls.ts) - `user.image`
 * holds two real shapes: a bare filename needing the `/api/avatar/`
 * proxy prefix (the common, current-upload case), or a full external
 * Cloudinary URL (legacy imported accounts). Every `<Avatar imageUrl=...>`
 * call site across the app was passing the raw, unresolved value
 * straight through - a bare filename is not a valid RN Image URI, so it
 * silently rendered nothing (not even the gradient/initials fallback,
 * since that only triggers for a falsy value) for every non-legacy
 * user, which is most of them. Resolved once here instead of at each
 * of the 9+ call sites, so a new one can't reintroduce the same gap.
 */
function resolveAvatarUrl(image?: string | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) {
    if (image.includes("res.cloudinary.com") && /\/upload\/v\d/.test(image)) {
      return image.replace("/upload/", "/upload/w_192,h_192,c_fill,f_auto,q_auto/");
    }
    return image;
  }
  return `${API_BASE_URL}/api/avatar/${image}`;
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
  const resolvedUrl = resolveAvatarUrl(imageUrl);

  if (resolvedUrl) {
    return (
      <Image
        source={{ uri: resolvedUrl }}
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
