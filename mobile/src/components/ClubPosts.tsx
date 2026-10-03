import { useCallback, useEffect, useState } from "react";
import { View, Pressable, Image, Alert, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { HeartIcon, MessageCircleIcon, ImageIcon, XIcon, MoreHorizontalIcon, MessagesSquareIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ComposerBar } from "@/components/ComposerBar";
import { showActionSheet } from "@/components/ActionSheet";
import { relativeTime } from "@/lib/relativeTime";
import { mediaUrl } from "@/lib/media";
import { reactToFeedPost, replyToFeedItem } from "@/api/feed";
import { getClubPosts, createClubPost, deleteClubPost, type ClubPost, type ClubPostReply } from "@/api/clubs";

/** MySQL "YYYY-MM-DD HH:MM:SS" (UTC) -> ISO for relativeTime. */
const iso = (s: string) => (s.includes("T") ? s : `${s.replace(" ", "T")}Z`);

function PostPhoto({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState(4 / 3);
  useEffect(() => {
    Image.getSize(uri, (w, h) => h > 0 && setRatio(Math.min(1.9, Math.max(0.8, w / h))), () => {});
  }, [uri]);
  return <Image source={{ uri }} style={{ width: "100%", aspectRatio: ratio, backgroundColor: colors.surface }} resizeMode="cover" />;
}

function ReplyBubble({ r }: { r: ClubPostReply }) {
  const { colors, spacing } = useTheme();
  const go = () => router.push({ pathname: "/profil/[username]", params: { username: r.authorUsername } });
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Pressable onPress={go}>
        <Avatar id={r.authorUserId} name={r.authorUsername} imageUrl={r.authorImage} size={30} frameColor={r.profileFrame} frameTier={r.frameTier} />
      </Pressable>
      <View style={{ flexShrink: 1, backgroundColor: colors.neutral200, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 12 }}>
        <ThemedText variant="bodySemibold" style={{ fontSize: 13 }} onPress={go}>{r.authorUsername}</ThemedText>
        <ThemedText variant="body" style={{ fontSize: 14, lineHeight: 19 }}>{r.text}</ThemedText>
      </View>
    </View>
  );
}

function ClubPostCard({ post, slug, canManage, canReply, onDeleted }: { post: ClubPost; slug: string; canManage: boolean; canReply: boolean; onDeleted: (id: number) => void }) {
  const { colors, spacing, radius } = useTheme();
  const { profile } = useAuth();
  const [liked, setLiked] = useState(post.likeState.liked);
  const [likeCount, setLikeCount] = useState(post.likeState.count);
  const [replies, setReplies] = useState<ClubPostReply[]>(post.replies);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const canDelete = profile?.id === post.authorUserId || canManage;
  const goAuthor = () => router.push({ pathname: "/profil/[username]", params: { username: post.authorUsername } });

  async function toggleLike() {
    if (!profile) return;
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => n + (was ? -1 : 1));
    try {
      const r = await reactToFeedPost(post.id, 1);
      const now = r.reaction === 1;
      if (now !== !was) {
        setLiked(now);
        setLikeCount((n) => n + (now ? 1 : -1));
      }
    } catch {
      setLiked(was);
      setLikeCount((n) => n + (was ? 1 : -1));
    }
  }

  async function sendReply() {
    const text = replyText.trim();
    if (!text || !profile) return;
    setSending(true);
    try {
      const r = await replyToFeedItem({ parentType: "feedPost", parentId: post.id }, text);
      setReplies((prev) => [...prev, { id: r.id, text, authorUsername: profile.username, authorUserId: profile.id, authorImage: profile.image, profileFrame: profile.profileFrame, frameTier: profile.frameTier, replies: [] }]);
      setReplyText("");
      setShowAll(true);
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yanıt gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  function openMenu() {
    showActionSheet({
      options: [
        { text: "Profili görüntüle", onPress: goAuthor },
        ...(canDelete
          ? [
              {
                text: "Gönderiyi sil",
                destructive: true,
                onPress: () =>
                  Alert.alert("Gönderi silinsin mi?", undefined, [
                    { text: "Vazgeç", style: "cancel" },
                    {
                      text: "Sil",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deleteClubPost(slug, post.id);
                          onDeleted(post.id);
                        } catch (err) {
                          Alert.alert("Hata", err instanceof Error ? err.message : "Silinemedi.");
                        }
                      },
                    },
                  ]),
              },
            ]
          : []),
      ],
    });
  }

  const photo = mediaUrl(post.image);
  const visibleReplies = showAll ? replies : replies.slice(-2);

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, paddingBottom: post.text ? spacing.sm : spacing.md }}>
        <Pressable onPress={goAuthor}>
          <Avatar id={post.authorUserId} name={post.authorUsername} imageUrl={post.authorImage} size={40} frameColor={post.profileFrame} frameTier={post.frameTier} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodySemibold" onPress={goAuthor} numberOfLines={1}>{post.authorUsername}</ThemedText>
          <ThemedText variant="caption" muted>{relativeTime(iso(post.createdAt))}</ThemedText>
        </View>
        <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Seçenekler" style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
          <MoreHorizontalIcon size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      {post.text ? <ThemedText variant="body" style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, fontSize: 15.5, lineHeight: 22 }}>{post.text}</ThemedText> : null}
      {photo && <PostPhoto uri={photo} />}

      <View style={{ paddingHorizontal: spacing.md }}>
        {likeCount > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingTop: spacing.sm }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
              <HeartIcon size={10} color="#fff" fill="#fff" />
            </View>
            <ThemedText variant="caption" muted style={{ fontSize: 13 }}>{liked ? (likeCount > 1 ? `Sen ve ${likeCount - 1} kişi` : "Sen") : likeCount}</ThemedText>
          </View>
        )}
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginTop: spacing.sm }} />
        <View style={{ flexDirection: "row", paddingVertical: 2 }}>
          {[
            { key: "like", label: "Beğen", icon: <HeartIcon size={19} color={liked ? colors.accent : colors.textMuted} fill={liked ? colors.accent : "transparent"} />, color: liked ? colors.accent : colors.textMuted, onPress: toggleLike },
            { key: "reply", label: replies.length > 0 ? `Yanıtla · ${replies.length}` : "Yanıtla", icon: <MessageCircleIcon size={19} color={colors.textMuted} />, color: colors.textMuted, onPress: () => setComposing(true) },
          ].map((a) => (
            <Pressable key={a.key} onPress={a.onPress} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
              {a.icon}
              <ThemedText variant="body" color={a.color} style={{ fontSize: 13.5, fontWeight: "500" }}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        {(replies.length > 0 || composing) && (
          <View style={{ gap: spacing.sm, paddingBottom: spacing.md, paddingTop: 4 }}>
            {!showAll && replies.length > 2 && (
              <ThemedText variant="bodySemibold" color={colors.textMuted} style={{ fontSize: 13.5 }} onPress={() => setShowAll(true)}>Önceki {replies.length - 2} yanıtı gör</ThemedText>
            )}
            {visibleReplies.map((r) => (
              <View key={r.id} style={{ gap: spacing.sm }}>
                <ReplyBubble r={r} />
                {r.replies.map((r2) => (
                  <View key={r2.id} style={{ marginLeft: 38 }}>
                    <ReplyBubble r={r2} />
                  </View>
                ))}
              </View>
            ))}
            {canReply && profile && (
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
                <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={30} />
                <View style={{ flex: 1 }}>
                  <ComposerBar bordered={false} value={replyText} onChangeText={setReplyText} onSend={sendReply} sending={sending} placeholder="Yanıt yaz…" autoFocus={composing && replies.length === 0} />
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function ClubPostsSection({ slug, canPost, canManage }: { slug: string; canPost: boolean; canManage: boolean }) {
  const { colors, spacing, radius } = useTheme();
  const { profile } = useAuth();
  const [posts, setPosts] = useState<ClubPost[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getClubPosts(slug);
      setPosts(r.items);
      setCursor(r.nextCursor);
    } catch {
      // older backend: no posts endpoint yet
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await getClubPosts(slug, cursor);
      setPosts((prev) => [...prev, ...r.items.filter((p) => !prev.some((x) => x.id === p.id))]);
      setCursor(r.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Fotoğraf eklemek için galeri izni vermelisin.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (res.canceled || res.assets.length === 0) return;
    const a = res.assets[0];
    setImage({ uri: a.uri, name: a.fileName ?? `club-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
  }

  async function publish() {
    if (!text.trim() && !image) return;
    setSending(true);
    try {
      await createClubPost(slug, text.trim(), image);
      setText("");
      setImage(null);
      await load();
    } catch (err) {
      Alert.alert("Paylaşılamadı", err instanceof Error ? err.message : "Bir sorun oluştu.");
    } finally {
      setSending(false);
    }
  }

  const canSend = (text.trim().length > 0 || !!image) && !sending;

  return (
    <View style={{ marginTop: spacing.md, marginHorizontal: spacing.md, gap: spacing.sm }}>
      <ThemedText variant="title" style={{ fontSize: 17, marginLeft: 4, marginBottom: 2 }}>Paylaşımlar</ThemedText>

      {canPost && profile ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={38} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Kulüple bir şey paylaş…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              style={{ flex: 1, minHeight: 40, maxHeight: 160, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: colors.neutral200, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.text, textAlignVertical: "top" }}
            />
          </View>
          {image && (
            <View style={{ alignSelf: "flex-start", marginLeft: 46 }}>
              <Image source={{ uri: image.uri }} style={{ width: 120, height: 120, borderRadius: radius.md }} />
              <Pressable onPress={() => setImage(null)} hitSlop={6} accessibilityLabel="Fotoğrafı kaldır" style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                <XIcon size={14} color="#fff" />
              </Pressable>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: 46 }}>
            <Pressable onPress={pickPhoto} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
              <ImageIcon size={19} color={colors.text} />
              <ThemedText variant="body" style={{ fontSize: 14, fontWeight: "500" }}>Fotoğraf</ThemedText>
            </Pressable>
            <Pressable onPress={publish} disabled={!canSend} style={({ pressed }) => ({ height: 36, paddingHorizontal: 18, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: !canSend ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText variant="bodySemibold" color="#fff" style={{ fontSize: 14 }}>Paylaş</ThemedText>}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.neutral400, padding: spacing.md }}>
          <ThemedText variant="body" muted style={{ textAlign: "center", fontSize: 14 }}>Paylaşım yapmak ve sohbete katılmak için kulübe katıl.</ThemedText>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
      ) : posts.length === 0 ? (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: spacing.xl }}>
          <MessagesSquareIcon size={28} color={colors.neutral400} />
          <ThemedText variant="body" muted>Henüz paylaşım yok{canPost ? " - ilkini sen yap." : "."}</ThemedText>
        </View>
      ) : (
        <>
          {posts.map((p) => (
            <ClubPostCard key={p.id} post={p} slug={slug} canManage={canManage} canReply={canPost} onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />
          ))}
          {cursor && (
            <Pressable onPress={loadMore} style={{ alignItems: "center", paddingVertical: spacing.md }}>
              {loadingMore ? <ActivityIndicator color={colors.accent} /> : <ThemedText variant="bodySemibold" color={colors.accent700}>Daha eski paylaşımlar</ThemedText>}
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
