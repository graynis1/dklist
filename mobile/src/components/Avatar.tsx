import { Text, Image, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/useTheme";
import { API_BASE_URL } from "@/api/config";

export type FrameTier = 1 | 2 | 3 | 4;

/**
 * Simplified mobile take on web's ProfileFrameRing (profile-frame-ring.tsx)
 * - that component leans on CSS conic-gradient/clip-path/keyframe
 * animations React Native has no equivalent for, so this isn't a pixel
 * port. What matters for the real gap it closes (purchased Puan Mağazası
 * frames were completely invisible on mobile - `profileFrame`/`frameTier`
 * were already being fetched into OtherProfile and nowhere else, never
 * rendered anywhere) is the same tier-escalation idea: a colored ring
 * that gets visibly more elaborate (thicker, glowing, jeweled, crowned)
 * the more expensive the frame was, so grinding for an Elmas frame still
 * reads as a real upgrade over a cheap Bronz one.
 */
function FrameRing({ color, size, tier, children }: { color: string; size: number; tier: FrameTier; children: React.ReactNode }) {
  // Matches web's own EntityAvatar cutoff (see profile-frame-ring.tsx's
  // `compact` doc comment): the customer's ask was for the frame to show
  // EVERYWHERE (feed/comments/messages), not just the profile page - but
  // studs/crown still clutter a 24-32px inline avatar, so only the ring
  // itself (still real, still colored per-tier) survives at small sizes.
  const compact = size < 40;
  const ringWidth = tier >= 4 ? 4 : tier >= 3 ? 3.5 : tier >= 2 ? 3 : 2;
  const outer = size + ringWidth * 2 + 4;
  const studSize = Math.max(4, size * 0.09);

  return (
    <View style={{ width: outer, height: outer, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: ringWidth,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
          ...(tier >= 3 && !compact
            ? { shadowColor: color, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 6 }
            : null),
        }}
      >
        {children}
      </View>
      {tier >= 2 &&
        !compact &&
        ([0, 90, 180, 270] as const).map((angle) => {
          const radius = outer / 2;
          const rad = (angle * Math.PI) / 180;
          return (
            <View
              key={angle}
              style={{
                position: "absolute",
                width: studSize,
                height: studSize,
                borderRadius: studSize / 2,
                backgroundColor: color,
                borderWidth: 1,
                borderColor: "#fff",
                left: outer / 2 + Math.cos(rad) * radius - studSize / 2,
                top: outer / 2 + Math.sin(rad) * radius - studSize / 2,
              }}
            />
          );
        })}
      {tier >= 4 && !compact && (
        <Text style={{ position: "absolute", top: -size * 0.14, fontSize: Math.max(10, size * 0.24) }}>👑</Text>
      )}
    </View>
  );
}

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
  frameColor,
  frameTier,
}: {
  id: number;
  name: string;
  imageUrl?: string | null;
  size?: number;
  /** Equipped Puan Mağazası profile frame - `user.profileFrame`'s raw
   * color, null if none equipped. Frames are deliberately not shown on
   * every tiny inline avatar (comment replies, message bubbles) - only
   * where a call site explicitly passes it, matching web's own
   * `compact` size cutoff for the full ring treatment. */
  frameColor?: string | null;
  frameTier?: FrameTier;
}) {
  const { colors, fontFamily } = useTheme();
  const resolvedUrl = resolveAvatarUrl(imageUrl);

  const inner = resolvedUrl ? (
    <Image source={{ uri: resolvedUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    (() => {
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
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: fontFamily.bodySemibold, fontSize: Math.max(10, size * 0.34), color: "#ffffff" }}>
            {initialsOf(name)}
          </Text>
        </LinearGradient>
      );
    })()
  );

  if (frameColor) {
    return (
      <FrameRing color={frameColor} size={size} tier={frameTier ?? 1}>
        {inner}
      </FrameRing>
    );
  }
  return inner;
}
