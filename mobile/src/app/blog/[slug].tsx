import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { API_BASE_URL } from "@/api/config";
import { getBlog, toggleBlogLike, type BlogDetail, type BlogLikeState } from "@/api/content";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getBlog(slug);
    if (!ignore?.current) {
      setBlog(result.blog);
      setLike(result.like);
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

  async function onLike() {
    setSaving(true);
    try {
      await toggleBlogLike(slug);
      await load();
    } finally {
      setSaving(false);
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
      {blog.ownerUsername && <ThemedText variant="caption" muted>@{blog.ownerUsername} · {blog.viewCount} görüntülenme</ThemedText>}
      <ThemedText variant="body">{stripHtml(blog.content ?? blog.preview)}</ThemedText>
      {like && (
        <Button
          title={like.liked ? `Beğenildi ✓ (${like.count})` : `Beğen (${like.count})`}
          variant={like.liked ? "primary" : "secondary"}
          onPress={onLike}
          disabled={saving}
        />
      )}
    </ScrollView>
  );
}
