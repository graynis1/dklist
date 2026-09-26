import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { API_BASE_URL } from "@/api/config";
import { getBlog, toggleBlogLike, addBlogComment, type BlogDetail, type BlogLikeState } from "@/api/content";
import { stripHtml } from "@/lib/stripHtml";

function imgUrl(img: string | null): string | null {
  if (!img) return null;
  return /^https?:\/\//i.test(img) ? img : `${API_BASE_URL}/api/blog-image/${img}`;
}

export default function BlogDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [like, setLike] = useState<BlogLikeState | null>(null);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getBlog(slug);
    if (!ignore?.current) {
      setBlog(result.blog);
      setLike(result.like);
      setComments(result.comments);
    }
  }, [slug]);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load]);

  async function onReact(value: 1 | -1) {
    setSaving(true);
    try {
      await toggleBlogLike(slug, value);
      await load();
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Blog yazısı bulunamadı.</ThemedText>
      </View>
    );
  }

  const src = imgUrl(blog.img);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      {src && <Image source={{ uri: src }} style={{ width: "100%", height: 200, borderRadius: 8 }} resizeMode="cover" />}
      <ThemedText variant="headline">{blog.title}</ThemedText>
      {blog.ownerUsername && (
        <Pressable
          onPress={() => router.push({ pathname: "/profil/[username]", params: { username: blog.ownerUsername! } })}
          style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}
        >
          <Avatar id={0} name={blog.ownerUsername} imageUrl={blog.ownerImage} size={28} />
          <ThemedText variant="caption" muted>@{blog.ownerUsername} · {blog.viewCount} görüntülenme</ThemedText>
        </Pressable>
      )}
      <ThemedText variant="body">{stripHtml(blog.content ?? blog.preview)}</ThemedText>
      {like && (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button
            title={like.liked ? `Beğenildi ✓ (${like.count})` : `Beğen (${like.count})`}
            variant={like.liked ? "primary" : "secondary"}
            onPress={() => onReact(1)}
            disabled={saving}
          />
          <Button
            title={like.disliked ? `Beğenilmedi ✓ (${like.dislikeCount})` : `Beğenme (${like.dislikeCount})`}
            variant={like.disliked ? "primary" : "secondary"}
            onPress={() => onReact(-1)}
            disabled={saving}
          />
        </View>
      )}

      {blog.commentsDisabled ? (
        <ThemedText variant="caption" muted>Bu yazıda yorumlar kapalı.</ThemedText>
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
    </ScrollView>
  );
}
