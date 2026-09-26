import { View, Text, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/useTheme";
import { API_BASE_URL } from "@/api/config";

/**
 * Ported from the reference's "Kitap Kapağı Sistemi" tile - degrade zemin
 * (gradient ground) + sırt gölgesi (spine shadow, a dark strip along the
 * left edge) + folyo çizgisi (a thin foil-like highlight line near the
 * top-right) - a layered placeholder that reads as a real book jacket
 * rather than a flat colored rectangle, for the (real, common) case where
 * a listing/book has no actual cover photo.
 */
export function BookCover({
  id,
  title,
  author,
  width = 52,
  height = 76,
  imageUrl,
  hasImage,
}: {
  id: number;
  title: string;
  author?: string;
  width?: number;
  height?: number;
  /** Pass this directly when the caller already built the right URL
   * (e.g. FeedCard, which needs bookCover.id, not the row's own id). */
  imageUrl?: string | null;
  /** Shortcut for every other caller: every book-list API response
   * already carries `hasImage` (see book.ts/library.ts/etc.) - this
   * builds the same `/kapak/{id}` URL FeedCard builds by hand, so a
   * new call site can't forget to and silently fall back to the
   * gradient placeholder (a real bug that hit almost every screen
   * before this - see the customer report this fixes). Ignored if
   * `imageUrl` is explicitly passed.
   */
  hasImage?: boolean;
}) {
  const { colors, fontFamily } = useTheme();
  const resolvedImageUrl = imageUrl ?? (hasImage ? `${API_BASE_URL}/kapak/${id}` : null);

  if (resolvedImageUrl) {
    return (
      <View style={{ width, height, borderRadius: 5, overflow: "hidden", backgroundColor: colors.surface }}>
        <Image source={{ uri: resolvedImageUrl }} style={{ width, height }} resizeMode="cover" />
      </View>
    );
  }

  const pairs: [string, string][] = [
    [colors.accent300, colors.accent700],
    [colors.neutral400, colors.neutral800],
    [colors.accent400, colors.accent800],
  ];
  const [from, to] = pairs[Math.abs(id) % pairs.length];
  const titleSize = Math.max(9, width * 0.2);
  const authorSize = Math.max(6.5, width * 0.145);

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        width,
        height,
        borderRadius: 5,
        padding: width * 0.13,
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "rgba(0,0,0,0.18)" }} />
      <View style={{ position: "absolute", top: height * 0.1, right: width * 0.13, width: width * 0.27, height: 1, backgroundColor: "rgba(255,255,255,0.55)" }} />
      <Text
        numberOfLines={3}
        style={{ fontFamily: fontFamily.headingSemibold, fontSize: titleSize, lineHeight: titleSize * 1.15, color: "#fff" }}
      >
        {title}
      </Text>
      {author ? (
        <Text
          numberOfLines={1}
          style={{ fontSize: authorSize, letterSpacing: 0.5, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}
        >
          {author}
        </Text>
      ) : null}
    </LinearGradient>
  );
}
