import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Pressable, Alert } from "react-native";
import { shareLink } from "@/lib/share";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { ThumbsUpIcon, ThumbsDownIcon, Share2Icon, ClockIcon, EyeIcon, NewspaperIcon, ChevronRightIcon, MessageSquareOffIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { RichText } from "@/components/RichText";
import { EmptyState } from "@/components/EmptyState";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { getBlog, toggleBlogLike, addBlogComment, type BlogDetail, type BlogLikeState } from "@/api/content";
import { mediaUrl } from "@/lib/media";
import { stripHtml } from "@/lib/stripHtml";
import { formatDateTr } from "@/lib/dateTr";

export default function BlogDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [like, setLike] = useState<BlogLikeState | null>(null);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getBlog(slug);
      setBlog(result.blog);
      setLike(result.like);
      setComments(result.comments);
    } catch {
      setBlog(null);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    navigation.setOptions({ title: "" });
  }, [navigation]);

  async function onReact(value: 1 | -1) {
    if (!like) return;
    setSaving(true);
    const prev = like;
    // Optimistic: toggle the pressed side, clear the other.
    const on = value === 1 ? !like.liked : !like.disliked;
    setLike({
      liked: value === 1 ? on : false,
      disliked: value === -1 ? on : false,
      count: like.count + (value === 1 ? (on ? 1 : -1) : like.liked ? -1 : 0),
      dislikeCount: like.dislikeCount + (value === -1 ? (on ? 1 : -1) : like.disliked ? -1 : 0),
    });
    try {
      await toggleBlogLike(slug, value);
    } catch {
      setLike(prev);
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    const trimmed = commentText.trim();
    if (trimmed.length < 2) return;
    setCommentSaving(true);
    try {
      await addBlogComment(slug, trimmed);
      setCommentText("");
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setCommentSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState icon={<NewspaperIcon size={30} color={colors.accent} />} title="Yazı bulunamadı" subtitle="Bu yazı kaldırılmış ya da henüz onaylanmamış olabilir." actionLabel="Bloglara Dön" onAction={() => router.back()} />
      </View>
    );
  }

  const src = mediaUrl(blog.img);
  const html = blog.content ?? blog.preview;
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const goAuthor = () => blog.ownerUsername && router.push({ pathname: "/profil/[username]", params: { username: blog.ownerUsername } });

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        {src && <Image source={{ uri: src }} style={{ width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.surface }} resizeMode="cover" />}

        <View style={{ backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md, ...shadow.sm }}>
          <ThemedText variant="label" color={colors.accent}>Blog</ThemedText>
          <ThemedText variant="bookTitle" style={{ fontSize: 32, lineHeight: 37 }}>{blog.title}</ThemedText>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pressable onPress={goAuthor}>
              <Avatar id={0} name={blog.ownerUsername ?? "DKList"} imageUrl={blog.ownerImage} size={42} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodySemibold" onPress={goAuthor}>{blog.ownerUsername ?? "DKList"}</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <ThemedText variant="caption" muted>{formatDateTr(blog.createdDate)}</ThemedText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <ClockIcon size={11} color={colors.textMuted} />
                  <ThemedText variant="caption" muted>{minutes} dk okuma</ThemedText>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <EyeIcon size={11} color={colors.textMuted} />
                  <ThemedText variant="caption" muted>{blog.viewCount}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider }} />

          {blog.preview && blog.content && !stripHtml(blog.content).replace(/\s+/g, " ").startsWith(blog.preview.replace(/\s+/g, " ").slice(0, 60)) ? (
            <ThemedText variant="quote" style={{ fontSize: 19, lineHeight: 27, color: colors.textMuted }}>{blog.preview}</ThemedText>
          ) : null}

          <RichText html={html} />
        </View>

        {like && (
          <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, ...shadow.sm }}>
            <ThemedText variant="caption" muted style={{ paddingBottom: spacing.sm }}>
              {like.count} beğeni · {comments.length} yorum
            </ThemedText>
            <View style={{ height: 1, backgroundColor: colors.divider }} />
            <View style={{ flexDirection: "row", paddingTop: 4 }}>
              {[
                { key: "up", label: "Beğen", Icon: ThumbsUpIcon, on: like.liked, onPress: () => onReact(1) },
                { key: "down", label: "Beğenmedim", Icon: ThumbsDownIcon, on: like.disliked, onPress: () => onReact(-1) },
                {
                  key: "share",
                  label: "Paylaş",
                  Icon: Share2Icon,
                  on: false,
                  onPress: () => void shareLink(blog.title, `https://dklist.com/blog/${blog.slug}`),
                },
              ].map((a) => (
                <Pressable
                  key={a.key}
                  disabled={saving && a.key !== "share"}
                  onPress={a.onPress}
                  style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
                >
                  <a.Icon size={18} color={a.on ? colors.accent : colors.textMuted} fill={a.on ? colors.accent : "transparent"} />
                  <ThemedText variant="bodySemibold" color={a.on ? colors.accent : colors.textMuted} style={{ fontSize: 13.5 }}>{a.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {blog.ownerUsername && (
          <Pressable onPress={goAuthor} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm, padding: spacing.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
            <Avatar id={0} name={blog.ownerUsername} imageUrl={blog.ownerImage} size={52} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="label" color={colors.textMuted} style={{ fontSize: 10 }}>Yazar</ThemedText>
              <ThemedText variant="title" style={{ fontSize: 18 }}>{blog.ownerUsername}</ThemedText>
              <ThemedText variant="caption" muted>Profilini ve kitaplığını gör</ThemedText>
            </View>
            <ChevronRightIcon size={20} color={colors.neutral400} />
          </Pressable>
        )}

        <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, ...shadow.sm }}>
          {blog.commentsDisabled ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <MessageSquareOffIcon size={18} color={colors.textMuted} />
              <ThemedText variant="body" muted>Bu yazıda yorumlar kapalı.</ThemedText>
            </View>
          ) : (
            <EntityCommentSection
              comments={comments}
              commentText={commentText}
              onCommentTextChange={setCommentText}
              onSubmitComment={submitComment}
              submitting={commentSaving}
              onReplied={load}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}
