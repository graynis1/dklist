import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, FlatList, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { getWriter, toggleWriterLike, addWriterComment, type EntityDetail, type EntityBookItem } from "@/api/entity";
import { API_BASE_URL } from "@/api/config";

export default function WriterScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [writer, setWriter] = useState<EntityDetail | null>(null);
  const [books, setBooks] = useState<EntityBookItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getWriter(slug);
    if (ignore?.current) return;
    setWriter(result.writer);
    setBooks(result.books);
    setLikeCount(result.likeCount);
    setLiked(result.liked);
    setComments(result.comments);
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

  async function onToggleLike() {
    setSaving(true);
    try {
      const result = await toggleWriterLike(slug);
      setLiked(result.liked);
      setLikeCount((n) => (result.liked ? n + 1 : Math.max(0, n - 1)));
    } finally {
      setSaving(false);
    }
  }

  async function submitComment() {
    const trimmed = commentText.trim();
    if (trimmed.length < 2) return;
    setCommentSaving(true);
    try {
      await addWriterComment(slug, trimmed);
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

  if (!writer) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Yazar bulunamadı.</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
        <Avatar id={writer.id} name={writer.name} imageUrl={writer.img ? `${API_BASE_URL}/api/writer-image/${writer.img}` : null} size={64} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <ThemedText variant="headline">{writer.name}</ThemedText>
          <ThemedText variant="caption" muted>{likeCount} beğeni</ThemedText>
        </View>
      </View>
      <View style={{ gap: spacing.xs }}>
        {writer.biyo && <ThemedText variant="body" muted>{writer.biyo}</ThemedText>}
      </View>

      <Button title={liked ? "Beğenildi ✓" : "Beğen"} variant={liked ? "primary" : "secondary"} onPress={onToggleLike} disabled={saving} block />

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Kitapları</ThemedText>
        <FlatList
          data={books}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{ gap: spacing.md }}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1, gap: spacing.xs }} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
              <BookCover id={item.id} title={item.name} author={writer.name} width={104} height={152} hasImage={item.hasImage} />
              <ThemedText variant="caption" numberOfLines={2}>{item.name}</ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={<ThemedText variant="body" muted>Henüz kitap bulunamadı.</ThemedText>}
        />
      </View>

      <EntityCommentSection
        comments={comments}
        commentText={commentText}
        onCommentTextChange={setCommentText}
        onSubmitComment={submitComment}
        submitting={commentSaving}
        onReplied={load}
      />
    </ScrollView>
  );
}
