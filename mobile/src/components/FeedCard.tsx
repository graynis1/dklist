import { mediaUrl } from "@/lib/media";
import { ClubMark, clubDisplayName } from "@/components/ClubMark";
import { useEffect, useState } from "react";
import { View, Pressable, Image, Alert, ScrollView, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  HeartIcon,
  MessageCircleIcon,
  Share2Icon,
  MoreHorizontalIcon,
  ChevronRightIcon,
  StarIcon,
  BookOpenIcon,
  LibraryIcon,
  UsersIcon,
  UserPlusIcon,
  NewspaperIcon,
  TagIcon,
  FeatherIcon,
  AwardIcon,
  TargetIcon,
  QuoteIcon,
} from "lucide-react-native";
import type { FeedItem, FeedReply } from "@/api/feed";
import { reactToComment, reactToFeedPost, replyToFeedItem } from "@/api/feed";
import { describeFeedItem } from "@/lib/feedCopy";
import { relativeTime } from "@/lib/relativeTime";
import { resolveFeedTargetHref, actorProfileHref } from "@/lib/feedNav";
import { shortAction, joinTr, multiHeadline, type FeedGroup } from "@/lib/feedGroups";
import { API_BASE_URL } from "@/api/config";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { ComposerBar } from "@/components/ComposerBar";
import { showActionSheet } from "@/components/ActionSheet";
import { shareLink } from "@/lib/share";

function shareUrl(item: FeedItem) {
  return item.targetHref ? `https://dklist.com${item.targetHref}` : "https://dklist.com/akis";
}

function ActorHeader({ item, subtitle, onMore }: { item: FeedItem; subtitle: React.ReactNode; onMore?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg }}>
      <Pressable onPress={() => router.push(actorProfileHref(item))}>
        <Avatar id={item.actorId} name={item.actorUsername} imageUrl={item.actorImage} size={40} frameColor={item.profileFrame} frameTier={item.frameTier} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <ThemedText variant="bodySemibold" style={{ fontSize: 15 }} onPress={() => router.push(actorProfileHref(item))} numberOfLines={1}>
          {item.actorUsername}
        </ThemedText>
        <ThemedText variant="caption" muted numberOfLines={2} style={{ fontSize: 13, marginTop: 1 }}>
          {subtitle}
        </ThemedText>
      </View>
      {onMore && (
        <Pressable onPress={onMore} hitSlop={10} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
          <MoreHorizontalIcon size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

function moreMenu(item: FeedItem) {
  const target = resolveFeedTargetHref(item);
  showActionSheet({
    title: item.actorUsername,
    options: [
      { text: "Profili görüntüle", onPress: () => router.push(actorProfileHref(item)) },
      ...(target ? [{ text: item.entityKind === "book" ? "Kitabı görüntüle" : "Görüntüle", onPress: () => router.push(target) }] : []),
      { text: "Paylaş", onPress: () => void shareLink(item.targetLabel ?? "", shareUrl(item)) },
    ],
    cancelText: "Kapat",
  });
}

/** Tappable book attachment - a link-preview style card. `rating` is the actor's own score, shown as a badge. */
function BookAttachment({ item, large, rating }: { item: FeedItem; large?: boolean; rating?: number | null }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const href = resolveFeedTargetHref(item);
  if (!item.bookCover && item.entityKind !== "book") return null;
  const coverUrl = item.bookCover?.hasImage ? `${API_BASE_URL}/kapak/${item.bookCover.id}` : null;
  const w = large ? 76 : 56;
  const score = item.bookCover?.score ?? 0;

  return (
    <Pressable
      disabled={!href}
      onPress={() => href && router.push(href)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        marginHorizontal: spacing.lg,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: pressed ? colors.neutral300 : colors.neutral200,
      })}
    >
      <View style={{ borderRadius: 4, ...shadow.md }}>
        <BookCover id={item.bookCover?.id ?? item.id} title={item.targetLabel ?? ""} width={w} height={Math.round(w * 1.5)} imageUrl={coverUrl} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText variant="title" numberOfLines={2} style={{ fontSize: large ? 17 : 15.5, lineHeight: large ? 22 : 20 }}>{item.targetLabel}</ThemedText>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          {score > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <StarIcon size={13} color={colors.accent} fill={colors.accent} />
              <ThemedText variant="caption" color={colors.text} style={{ fontWeight: "600" }}>{score.toFixed(1)}</ThemedText>
              <ThemedText variant="caption" muted>DKList</ThemedText>
            </View>
          )}
          {rating != null && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.accent }}>
              <StarIcon size={11} color="#fff" fill="#fff" />
              <ThemedText variant="caption" color="#fff" style={{ fontWeight: "700", fontSize: 12 }}>{rating}/10</ThemedText>
            </View>
          )}
        </View>
        {href && <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>Kitabı incele</ThemedText>}
      </View>
      <ChevronRightIcon size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/** Post photo at its real aspect ratio (clamped so a tall phone shot doesn't fill the screen). */
function PostImage({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState(4 / 3);
  useEffect(() => {
    Image.getSize(uri, (w, h) => h > 0 && setRatio(Math.min(1.9, Math.max(0.8, w / h))), () => {});
  }, [uri]);
  return <Image source={{ uri }} style={{ width: "100%", aspectRatio: ratio, backgroundColor: colors.surface }} resizeMode="cover" />;
}

const ENTITY_ICON: Record<string, typeof UsersIcon> = {
  club: UsersIcon,
  user: UserPlusIcon,
  blog: NewspaperIcon,
  store: TagIcon,
  writer: FeatherIcon,
  translator: FeatherIcon,
  publisher: LibraryIcon,
};

function EntityAttachment({ item }: { item: FeedItem }) {
  const { colors, spacing, radius } = useTheme();
  const href = resolveFeedTargetHref(item);
  const Icon = ENTITY_ICON[item.entityKind ?? ""] ?? BookOpenIcon;
  const mediaImg = mediaUrl(item.media?.image);
  const round = item.entityKind === "user" || item.entityKind === "writer";
  if (!item.targetLabel) return null;
  return (
    <Pressable
      disabled={!href}
      onPress={() => href && router.push(href)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
    >
      {item.entityKind === "club" ? (
        <ClubMark name={item.targetLabel} image={item.media?.image} size={60} />
      ) : mediaImg ? (
        <Image source={{ uri: mediaImg }} style={round ? { width: 52, height: 52, borderRadius: 26 } : { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surface }} resizeMode="cover" />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
          <Icon size={21} color={colors.accent} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        {item.entityKind === "store" && item.media?.price != null && (
          <ThemedText variant="bodySemibold" color={colors.accent700} style={{ fontSize: 14 }}>{item.media.price > 0 ? `${item.media.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}</ThemedText>
        )}
        <ThemedText variant="title" numberOfLines={2}>{clubDisplayName(item.targetLabel.replace(/[“”"]/g, ""))}</ThemedText>
        {item.media?.subtitle ? <ThemedText variant="caption" muted numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>{item.media.subtitle}</ThemedText> : null}
      </View>
      {href && <ChevronRightIcon size={18} color={colors.textMuted} />}
    </Pressable>
  );
}

function ActionButton({ icon, label, color, onPress, disabled }: { icon: React.ReactNode; label: string; color: string; onPress: () => void; disabled?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
    >
      {icon}
      <ThemedText variant="body" color={color} style={{ fontSize: 13.5, fontWeight: "500" }}>{label}</ThemedText>
    </Pressable>
  );
}

function ReplyBubble({ r }: { r: FeedReply }) {
  const { colors, spacing } = useTheme();
  const go = () => router.push({ pathname: "/profil/[username]", params: { username: r.authorUsername } });
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Pressable onPress={go}>
        <Avatar id={r.authorUserId} name={r.authorUsername} imageUrl={r.authorImage} size={32} frameColor={r.profileFrame} frameTier={r.frameTier} />
      </Pressable>
      <View style={{ flexShrink: 1, backgroundColor: colors.neutral200, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 }}>
        <ThemedText variant="bodySemibold" style={{ fontSize: 13 }} onPress={go}>{r.authorUsername}</ThemedText>
        <ThemedText variant="body" style={{ fontSize: 14, lineHeight: 19 }}>{r.text}</ThemedText>
      </View>
    </View>
  );
}

/** A real post (feed_post) or book comment/quote - the only feed items with
 * their own like/reply systems, so the only ones with an action bar. */
export function PostCard({ item }: { item: FeedItem }) {
  const { colors, spacing, fontFamily } = useTheme();
  const { profile } = useAuth();
  const likeState = item.likeState ?? item.postLikeState;
  const [liked, setLiked] = useState(likeState?.liked ?? false);
  const [likeCount, setLikeCount] = useState(likeState?.count ?? 0);
  const [likeSaving, setLikeSaving] = useState(false);
  const [replies, setReplies] = useState<FeedReply[]>(item.replies);
  const [showAll, setShowAll] = useState(false);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const canInteract = Boolean(item.replyTarget);
  const isQuote = item.reason === "comment" && item.isQuote;
  const text = item.excerpt ?? "";
  const verb =
    item.reason === "feed_post"
      ? null
      : isQuote
        ? `${item.targetLabel ? `“${item.targetLabel}” kitabından` : "bir"} alıntı paylaştı`
        : item.targetLabel
          ? `“${item.targetLabel}” hakkında yorum yaptı`
          : "bir yorum yaptı";
  const shortText = !isQuote && !item.feedPostImage && text.length > 0 && text.length < 90;

  async function onToggleLike() {
    if (!canInteract || likeSaving) return;
    setLikeSaving(true);
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => n + (was ? -1 : 1));
    try {
      const result = item.commentId != null ? await reactToComment(item.commentId, 1) : await reactToFeedPost(item.feedPostId!, 1);
      const nowLiked = result.reaction === 1;
      if (nowLiked !== !was) {
        setLiked(nowLiked);
        setLikeCount((n) => n + (nowLiked ? 1 : -1));
      }
    } catch {
      setLiked(was);
      setLikeCount((n) => n + (was ? 1 : -1));
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
        { id: result.id, text: trimmed, authorUsername: profile.username, authorUserId: profile.id, authorImage: profile.image, profileFrame: profile.profileFrame, frameTier: profile.frameTier, replies: [] },
      ]);
      setReplyText("");
      setShowAll(true);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setReplySaving(false);
    }
  }

  const visibleReplies = showAll ? replies : replies.slice(-2);

  return (
    <View style={{ backgroundColor: colors.card, paddingTop: spacing.md, paddingBottom: canInteract ? 4 : spacing.md, gap: spacing.md }}>
      <ActorHeader
        item={item}
        onMore={() => moreMenu(item)}
        subtitle={
          <>
            {verb ? `${verb} · ` : ""}
            {relativeTime(item.createdAt)}
          </>
        }
      />

      {isQuote ? (
        <View style={{ marginHorizontal: spacing.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12, backgroundColor: colors.accent100, gap: spacing.sm }}>
          <QuoteIcon size={22} color={colors.accent} />
          <ThemedText variant="quote" style={{ fontSize: 17, lineHeight: 25, color: colors.accent900 }}>{text}</ThemedText>
        </View>
      ) : text ? (
        <ThemedText
          variant="body"
          style={{ paddingHorizontal: spacing.lg, fontSize: shortText ? 17 : 15.5, lineHeight: shortText ? 24 : 22, fontFamily: shortText ? fontFamily.bodyRegular : undefined }}
        >
          {text}
        </ThemedText>
      ) : null}

      {item.feedPostImage && <PostImage uri={mediaUrl(item.feedPostImage)!} />}

      {item.entityKind === "book" && <BookAttachment item={item} />}

      {canInteract && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {(likeCount > 0 || replies.length > 0) && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: spacing.sm }}>
              {likeCount > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                    <HeartIcon size={10} color="#fff" fill="#fff" />
                  </View>
                  <ThemedText variant="caption" muted style={{ fontSize: 13 }}>
                    {liked ? (likeCount > 1 ? `Sen ve ${likeCount - 1} kişi` : "Sen") : likeCount}
                  </ThemedText>
                </View>
              ) : (
                <View />
              )}
              {replies.length > 0 && (
                <ThemedText variant="caption" muted style={{ fontSize: 13 }} onPress={() => setShowAll((v) => !v)}>
                  {replies.length} yorum
                </ThemedText>
              )}
            </View>
          )}
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />
          <View style={{ flexDirection: "row", paddingVertical: 3 }}>
            <ActionButton
              onPress={onToggleLike}
              disabled={likeSaving}
              icon={<HeartIcon size={19} color={liked ? colors.accent : colors.textMuted} fill={liked ? colors.accent : "transparent"} />}
              label="Beğen"
              color={liked ? colors.accent : colors.textMuted}
            />
            <ActionButton onPress={() => setComposing(true)} icon={<MessageCircleIcon size={19} color={colors.textMuted} />} label="Yorum Yap" color={colors.textMuted} />
            <ActionButton
              onPress={() => void shareLink(text, shareUrl(item))}
              icon={<Share2Icon size={19} color={colors.textMuted} />}
              label="Paylaş"
              color={colors.textMuted}
            />
          </View>

          {(replies.length > 0 || composing) && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />}

          {replies.length > 0 && (
            <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
              {!showAll && replies.length > 2 && (
                <ThemedText variant="bodySemibold" color={colors.textMuted} style={{ fontSize: 13.5 }} onPress={() => setShowAll(true)}>
                  Önceki {replies.length - 2} yorumu gör
                </ThemedText>
              )}
              {visibleReplies.map((r) => (
                <ReplyBubble key={r.id} r={r} />
              ))}
            </View>
          )}

          {(composing || replies.length > 0) && profile && (
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingVertical: spacing.sm }}>
              <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={32} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
              <View style={{ flex: 1 }}>
                <ComposerBar
                  bordered={false}
                  value={replyText}
                  onChangeText={setReplyText}
                  onSend={onSubmitReply}
                  sending={replySaving}
                  placeholder="Yorum yaz…"
                  autoFocus={composing && replies.length === 0}
                />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/** Badges and reading goals - celebratory, not a plain text row. */
export function MilestoneCard({ item }: { item: FeedItem }) {
  const { colors, spacing, radius } = useTheme();
  const { verb } = describeFeedItem(item);
  const isBadge = item.reason === "badge_earned";
  const Icon = isBadge ? AwardIcon : TargetIcon;
  return (
    <View style={{ backgroundColor: colors.card, paddingVertical: spacing.md, gap: spacing.md }}>
      <ActorHeader item={item} subtitle={relativeTime(item.createdAt)} onMore={() => moreMenu(item)} />
      <LinearGradient
        colors={[colors.accent700, colors.accent400]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: spacing.lg, borderRadius: radius.xl, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, alignItems: "center", gap: spacing.sm, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.1)" }} />
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Icon size={32} color="#fff" />
        </View>
        <ThemedText variant="label" color="rgba(255,255,255,0.85)">{isBadge ? "Yeni rozet" : item.reason === "reading_goal_achieved" ? "Hedef tamamlandı" : "Okuma hedefi"}</ThemedText>
        <ThemedText variant="headline" color="#fff" style={{ textAlign: "center", fontSize: 22 }}>
          {isBadge ? item.badgeName ?? "Yeni rozet" : item.goalCount ? `${item.goalCount} kitap` : "Yıllık hedef"}
        </ThemedText>
        <ThemedText variant="body" color="rgba(255,255,255,0.9)" style={{ textAlign: "center" }}>
          {item.actorUsername} {verb.replace(/[🎉🏆]/gu, "").trim()}
        </ThemedText>
      </LinearGradient>
    </View>
  );
}

/** One or more passive activities by the same person on the same target. */
function SameTargetCard({ items }: { items: FeedItem[] }) {
  const { colors, spacing } = useTheme();
  const first = items[0];
  const multi = items.length > 1;
  const isBook = first.entityKind === "book";
  const subtitle = multi ? `${joinTr(items.map(shortAction))}` : describeFeedItem(first).verb.replace(/:$/, "");
  const rating = items.find((i) => i.reason === "rating" && i.ratingValue != null)?.ratingValue ?? null;

  return (
    <View style={{ backgroundColor: colors.card, paddingVertical: spacing.md, gap: spacing.md }}>
      <ActorHeader
        item={first}
        onMore={() => moreMenu(first)}
        subtitle={
          <>
            {subtitle} · {relativeTime(first.createdAt)}
          </>
        }
      />
      {isBook ? <BookAttachment item={first} large rating={rating} /> : <EntityAttachment item={first} />}
    </View>
  );
}

/** The same kind of activity across several targets ("3 kulübe katıldı"). */
function SameReasonCard({ items }: { items: FeedItem[] }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const first = items[0];
  const isBook = first.entityKind === "book";

  return (
    <View style={{ backgroundColor: colors.card, paddingVertical: spacing.md, gap: spacing.md }}>
      <ActorHeader item={first} onMore={() => moreMenu(first)} subtitle={`${multiHeadline(first.reason, items.length, first.entityKind, first.readStatus)} · ${relativeTime(first.createdAt)}`} />
      {isBook ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {items.map((i) => {
            const href = resolveFeedTargetHref(i);
            return (
              <Pressable key={i.id} disabled={!href} onPress={() => href && router.push(href as Href)} style={{ width: 104, gap: 6 }}>
                <View style={{ borderRadius: 5, ...shadow.sm }}>
                  <BookCover id={i.bookCover?.id ?? i.id} title={i.targetLabel ?? ""} width={104} height={154} imageUrl={i.bookCover?.hasImage ? `${API_BASE_URL}/kapak/${i.bookCover.id}` : null} />
                </View>
                <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{i.targetLabel}</ThemedText>
                {i.ratingValue != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: -3 }}>
                    <StarIcon size={11} color={colors.accent} fill={colors.accent} />
                    <ThemedText variant="caption" color={colors.accent700}>{i.ratingValue}/10</ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" }}>
          {items.map((i, idx) => {
            const href = resolveFeedTargetHref(i);
            const Icon = ENTITY_ICON[i.entityKind ?? ""] ?? BookOpenIcon;
            return (
              <Pressable
                key={i.id}
                disabled={!href}
                onPress={() => href && router.push(href)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral200 : colors.neutral100 })}
              >
                {i.entityKind === "club" ? (
                  <ClubMark name={i.targetLabel ?? ""} image={i.media?.image} size={44} />
                ) : mediaUrl(i.media?.image) ? (
                  <Image source={{ uri: mediaUrl(i.media?.image)! }} style={{ width: 44, height: 44, borderRadius: i.entityKind === "user" || i.entityKind === "writer" ? 22 : 8, backgroundColor: colors.surface }} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={colors.accent} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySemibold" numberOfLines={1}>{clubDisplayName((i.targetLabel ?? "").replace(/[“”"]/g, ""))}</ThemedText>
                  {i.media?.subtitle ? <ThemedText variant="caption" muted numberOfLines={1}>{i.entityKind === "store" && i.media.price != null ? `${i.media.price > 0 ? `${i.media.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"} · ` : ""}{i.media.subtitle}</ThemedText> : null}
                </View>
                {href && <ChevronRightIcon size={17} color={colors.textMuted} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function FeedGroupCard({ group }: { group: FeedGroup }) {
  if (group.kind === "post") {
    const r = group.item.reason;
    if (r === "badge_earned" || r === "reading_goal_set" || r === "reading_goal_achieved") return <MilestoneCard item={group.item} />;
    return <PostCard item={group.item} />;
  }
  if (group.kind === "sameReason") return <SameReasonCard items={group.items} />;
  return <SameTargetCard items={group.items} />;
}
