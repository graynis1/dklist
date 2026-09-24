import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { getTranslator, toggleTranslatorLike, type EntityDetail, type EntityBookItem } from "@/api/entity";

export default function TranslatorScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [translator, setTranslator] = useState<EntityDetail | null>(null);
  const [books, setBooks] = useState<EntityBookItem[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getTranslator(slug);
    if (ignore?.current) return;
    setTranslator(result.translator);
    setBooks(result.books);
    setLikeCount(result.likeCount);
    setLiked(result.liked);
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
      const result = await toggleTranslatorLike(slug);
      setLiked(result.liked);
      setLikeCount((n) => (result.liked ? n + 1 : Math.max(0, n - 1)));
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

  if (!translator) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Çevirmen bulunamadı.</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">{translator.name}</ThemedText>
        {translator.biyo && <ThemedText variant="body" muted>{translator.biyo}</ThemedText>}
        <ThemedText variant="caption" muted>{likeCount} beğeni</ThemedText>
      </View>

      <Button title={liked ? "Beğenildi ✓" : "Beğen"} variant={liked ? "primary" : "secondary"} onPress={onToggleLike} disabled={saving} block />

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Çevirileri</ThemedText>
        <FlatList
          data={books}
          numColumns={3}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: spacing.md }}
          contentContainerStyle={{ gap: spacing.md }}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1, gap: spacing.xs }} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
              <BookCover id={item.id} title={item.name} author={translator.name} width={104} height={152} />
              <ThemedText variant="caption" numberOfLines={2}>{item.name}</ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={<ThemedText variant="body" muted>Henüz kitap bulunamadı.</ThemedText>}
        />
      </View>
    </ScrollView>
  );
}
