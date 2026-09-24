import { View } from "react-native";
import type { FeedItem } from "@/api/feed";
import { describeFeedItem } from "@/lib/feedCopy";
import { relativeTime } from "@/lib/relativeTime";
import { API_BASE_URL } from "@/api/config";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";

/**
 * Ported from the reference's Akış cards (activity row + book-result card
 * + quote card + badge-earned pill). Read-only this pass - the ♡/Yorum/
 * Paylaş row is static, matching what the mockup itself shows (no
 * interaction wired), not yet the real like/reply/share actions the web
 * feed has (see mobile/README.md's "deliberately not built yet").
 */
export function FeedCard({ item }: { item: FeedItem }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const { verb, target } = describeFeedItem(item);
  const isQuoteCard = item.reason === "comment" && item.isQuote && item.excerpt;
  const bookImageUrl = item.bookCover?.hasImage ? `${API_BASE_URL}/kapak/${item.bookCover.id}` : null;

  if (item.reason === "badge_earned") {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Avatar id={item.actorId} name={item.actorUsername} imageUrl={item.actorImage} size={26} />
        <ThemedText variant="body" style={{ flex: 1 }}>
          <ThemedText variant="bodySemibold">{item.actorUsername}</ThemedText> {verb}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.md, gap: spacing.sm, ...shadow.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Avatar id={item.actorId} name={item.actorUsername} imageUrl={item.actorImage} size={32} />
        <View style={{ flex: 1 }}>
          <ThemedText variant="body">
            <ThemedText variant="bodySemibold">{item.actorUsername}</ThemedText> <ThemedText variant="body" muted>{verb}</ThemedText>
          </ThemedText>
        </View>
      </View>

      {isQuoteCard ? (
        <View style={{ borderLeftWidth: 3, borderLeftColor: colors.accent500, paddingLeft: spacing.md, gap: spacing.xs }}>
          <ThemedText variant="quote">
            &ldquo;{item.excerpt}&rdquo;
          </ThemedText>
          {target && (
            <ThemedText variant="caption" muted>
              {target}
            </ThemedText>
          )}
        </View>
      ) : target && item.entityKind === "book" ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <BookCover id={item.bookCover?.id ?? item.actorId} title={item.targetLabel ?? ""} width={44} height={64} imageUrl={bookImageUrl} />
          <View style={{ justifyContent: "center" }}>
            <ThemedText variant="title">{item.targetLabel}</ThemedText>
            {item.bookCover && item.bookCover.score > 0 && (
              <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600", marginTop: 4 }}>
                Puanı: {item.bookCover.score.toFixed(1)}/10
              </ThemedText>
            )}
          </View>
        </View>
      ) : target ? (
        <ThemedText variant="title">{item.targetLabel}</ThemedText>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <ThemedText variant="caption" muted>
          {relativeTime(item.createdAt)}
        </ThemedText>
      </View>
    </View>
  );
}
