import { View, Pressable, Image } from "react-native";
import { router } from "expo-router";
import type { FeedItem } from "@/api/feed";
import { describeFeedItem } from "@/lib/feedCopy";
import { relativeTime } from "@/lib/relativeTime";
import { resolveFeedTargetHref, actorProfileHref } from "@/lib/feedNav";
import { API_BASE_URL } from "@/api/config";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";

/**
 * Ported from the reference's Akış cards (activity row + book-result card
 * + quote card + badge-earned pill). The actor (avatar/name) always jumps
 * to their profile; the target (book/writer/translator/publisher) jumps
 * to its own detail screen when one exists (`resolveFeedTargetHref` -
 * blog/store/club targets don't have a mobile screen yet, so those stay
 * non-interactive rather than linking to a broken route). The ♡/Yorum/
 * Paylaş row itself is still static, matching the reference mockup - real
 * like/reply/share actions on feed items are separate future work.
 */
export function FeedCard({ item }: { item: FeedItem }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const { verb, target } = describeFeedItem(item);
  const isQuoteCard = item.reason === "comment" && item.isQuote && item.excerpt;
  // Standalone status-update posts (see mobile's own composer on Akış) -
  // `describeFeedItem` deliberately returns target:null for these (same
  // as the web copy it's ported from - the post's own text isn't a
  // "target" the way a book/writer is), so the post body has to be read
  // straight off `excerpt` here instead.
  const isPostCard = item.reason === "feed_post" && item.excerpt;
  const bookImageUrl = item.bookCover?.hasImage ? `${API_BASE_URL}/kapak/${item.bookCover.id}` : null;
  const targetHref = resolveFeedTargetHref(item);

  const actorRow = (
    <Pressable onPress={() => router.push(actorProfileHref(item))} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Avatar id={item.actorId} name={item.actorUsername} imageUrl={item.actorImage} size={item.reason === "badge_earned" ? 26 : 32} />
      <ThemedText variant="body" style={{ flex: 1 }}>
        <ThemedText variant="bodySemibold">{item.actorUsername}</ThemedText> <ThemedText variant="body" muted>{verb}</ThemedText>
      </ThemedText>
    </Pressable>
  );

  if (item.reason === "badge_earned") {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
        {actorRow}
      </View>
    );
  }

  const targetContent = isQuoteCard ? (
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
  ) : isPostCard ? (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="body">{item.excerpt}</ThemedText>
      {item.feedPostImage && (
        <Image source={{ uri: item.feedPostImage }} style={{ width: "100%", height: 180, borderRadius: radius.md }} resizeMode="cover" />
      )}
      {item.entityKind === "book" && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <BookCover id={item.bookCover?.id ?? item.actorId} title={item.targetLabel ?? ""} width={40} height={58} imageUrl={bookImageUrl} />
          <ThemedText variant="title" style={{ flex: 1, alignSelf: "center" }}>{item.targetLabel}</ThemedText>
        </View>
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
  ) : null;

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.md, gap: spacing.sm, ...shadow.sm }}>
      {actorRow}

      {targetContent && targetHref ? (
        <Pressable onPress={() => router.push(targetHref)}>{targetContent}</Pressable>
      ) : (
        targetContent
      )}

      <View style={{ flexDirection: "row", gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <ThemedText variant="caption" muted>
          {relativeTime(item.createdAt)}
        </ThemedText>
      </View>
    </View>
  );
}
