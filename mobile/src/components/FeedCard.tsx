import { useState } from "react";
import { View, Pressable, Image, Share, Alert } from "react-native";
import { router } from "expo-router";
import { HeartIcon, MessageCircleIcon, Share2Icon } from "lucide-react-native";
import type { FeedItem, FeedReply } from "@/api/feed";
import { reactToComment, reactToFeedPost, replyToFeedItem } from "@/api/feed";
import { describeFeedItem } from "@/lib/feedCopy";
import { relativeTime } from "@/lib/relativeTime";
import { resolveFeedTargetHref, actorProfileHref } from "@/lib/feedNav";
import { API_BASE_URL } from "@/api/config";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

/**
 * Ported from the reference's Akış cards. Real customer report: the
 * ♡/Yorum/Paylaş row was entirely static ("her şeyi çok eksik yapmışsın")
 * despite the backend (getSiteFeed) already computing a full likeState/
 * postLikeState/replyTarget/replies for every "comment"/"feed_post" item -
 * only reason those two ever carry that data (see feed.ts's own
 * POST_REASONS split): passive activity rows (book_read, badge_earned,
 * follow, ...) genuinely have no comment/like concept of their own on web
 * either, so they correctly stay non-interactive.
 */
export function FeedCard({ item }: { item: FeedItem }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const { profile } = useAuth();
  const { verb, target } = describeFeedItem(item);
  const isQuoteCard = item.reason === "comment" && item.isQuote && item.excerpt;
  const isPostCard = item.reason === "feed_post" && item.excerpt;
  const bookImageUrl = item.bookCover?.hasImage ? `${API_BASE_URL}/kapak/${item.bookCover.id}` : null;
  const targetHref = resolveFeedTargetHref(item);

  const likeState = item.likeState ?? item.postLikeState;
  const [liked, setLiked] = useState(likeState?.liked ?? false);
  const [likeCount, setLikeCount] = useState(likeState?.count ?? 0);
  const [likeSaving, setLikeSaving] = useState(false);
  const [replies, setReplies] = useState<FeedReply[]>(item.replies);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const canInteract = Boolean(item.replyTarget);

  async function onToggleLike() {
    if (!canInteract || likeSaving) return;
    setLikeSaving(true);
    try {
      const result = item.commentId != null ? await reactToComment(item.commentId, 1) : await reactToFeedPost(item.feedPostId!, 1);
      const nowLiked = result.reaction === 1;
      setLiked(nowLiked);
      setLikeCount((n) => n + (nowLiked ? 1 : -1));
    } catch {
      // Silent - a failed reaction just leaves the button as it was.
    } finally {
      setLikeSaving(false);
    }
  }

  async function onSubmitReply() {
    const trimmed = replyText.trim();
    if (!trimmed || !item.replyTarget || !profile) return;
    setReplySaving(true);
    try {
      const result = await replyToFeedItem(item.replyTarget, trimmed);
      setReplies((prev) => [
        ...prev,
        {
          id: result.id,
          text: trimmed,
          authorUsername: profile.username,
          authorUserId: profile.id,
          authorImage: profile.image,
          profileFrame: profile.profileFrame,
          frameTier: profile.frameTier,
          replies: [],
        },
      ]);
      setReplyText("");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yanıt eklenemedi.");
    } finally {
      setReplySaving(false);
    }
  }

  async function onShare() {
    const url = targetHref ? `${API_BASE_URL}${targetHref}` : "https://dklist.com/akis";
    try {
      await Share.share({ message: item.excerpt ? `${item.excerpt}\n\n${url}` : url, url });
    } catch {
      // User cancelled the share sheet - nothing to do.
    }
  }

  const actorRow = (
    <Pressable onPress={() => router.push(actorProfileHref(item))} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <Avatar
        id={item.actorId}
        name={item.actorUsername}
        imageUrl={item.actorImage}
        size={item.reason === "badge_earned" ? 26 : 32}
        frameColor={item.profileFrame}
        frameTier={item.frameTier}
      />
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">
          <ThemedText variant="bodySemibold">{item.actorUsername}</ThemedText> <ThemedText variant="body" muted>{verb}</ThemedText>
        </ThemedText>
        {/* Facebook-style placement: the timestamp sits right under the
            actor line, not mixed into the action row below - it reads as
            metadata about the POST, not another action button. */}
        <ThemedText variant="caption" muted style={{ marginTop: 1 }}>
          {relativeTime(item.createdAt)}
        </ThemedText>
      </View>
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

      {canInteract && (likeCount > 0 || replies.length > 0) && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.xs }}>
          {likeCount > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HeartIcon size={9} color="#fff" fill="#fff" />
              </View>
              <ThemedText variant="caption" muted>{likeCount}</ThemedText>
            </View>
          ) : (
            <View />
          )}
          {replies.length > 0 && (
            <ThemedText variant="caption" muted>{replies.length} yorum</ThemedText>
          )}
        </View>
      )}

      {canInteract && (
        <>
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          {/* Facebook's own post-footer anatomy: three EQUAL-width buttons
              spanning the full card, icon-over/beside-label centered in
              each third - not loosely left-aligned icons with gaps
              (the previous layout, and the customer's explicit "diziliş...
              Facebook'a benzet" complaint). */}
          <View style={{ flexDirection: "row" }}>
            <Pressable
              onPress={onToggleLike}
              disabled={likeSaving}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm }}
            >
              <HeartIcon size={18} color={liked ? colors.accent : colors.textMuted} fill={liked ? colors.accent : "transparent"} />
              <ThemedText variant="caption" color={liked ? colors.accent : colors.textMuted} style={{ fontWeight: "600" }}>
                Beğen
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowReplies((v) => !v)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm }}
            >
              <MessageCircleIcon size={18} color={showReplies ? colors.accent : colors.textMuted} />
              <ThemedText variant="caption" color={showReplies ? colors.accent : colors.textMuted} style={{ fontWeight: "600" }}>
                Yorum Yap
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onShare}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm }}
            >
              <Share2Icon size={18} color={colors.textMuted} />
              <ThemedText variant="caption" color={colors.textMuted} style={{ fontWeight: "600" }}>
                Paylaş
              </ThemedText>
            </Pressable>
          </View>
        </>
      )}

      {showReplies && canInteract && (
        <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
          {replies.map((r) => (
            <View key={r.id} style={{ flexDirection: "row", gap: spacing.sm }}>
              <Avatar id={r.authorUserId} name={r.authorUsername} imageUrl={r.authorImage} size={24} frameColor={r.profileFrame} frameTier={r.frameTier} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="caption" style={{ fontWeight: "600" }}>@{r.authorUsername}</ThemedText>
                <ThemedText variant="caption">{r.text}</ThemedText>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <TextField label="" value={replyText} onChangeText={setReplyText} placeholder="Yanıt yaz…" />
            </View>
            <Button title="Gönder" onPress={onSubmitReply} disabled={replySaving || replyText.trim().length < 2} />
          </View>
        </View>
      )}
    </View>
  );
}
