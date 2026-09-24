import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { getList, deleteList, removeBookFromList, type ListDetail } from "@/api/lists";

export default function ListeDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<{ list: ListDetail; isOwner: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getList(slug);
    if (!ignore?.current) setData(result);
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

  useEffect(() => {
    if (data) navigation.setOptions({ title: data.list.title });
  }, [navigation, data]);

  async function onRemoveBook(bookId: number) {
    await removeBookFromList(slug, bookId);
    await load();
  }

  function onDeleteList() {
    Alert.alert("Listeyi Sil", "Bu listeyi silmek istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await deleteList(slug);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Liste bulunamadı.</ThemedText>
      </View>
    );
  }

  const { list, isOwner } = data;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">{list.title}</ThemedText>
        <ThemedText variant="caption" muted>@{list.ownerUsername} · {list.isPublic ? "Herkese açık" : "Gizli"}</ThemedText>
        {list.description && <ThemedText variant="body">{list.description}</ThemedText>}
      </View>

      <View style={{ gap: spacing.md }}>
        {list.books.map((b) => (
          <View key={b.id} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <Pressable style={{ flexDirection: "row", gap: spacing.sm, flex: 1 }} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })}>
              <BookCover id={b.id} title={b.name} author={b.writers.join(", ")} width={56} height={82} />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <ThemedText variant="title" numberOfLines={2}>{b.name}</ThemedText>
                <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
              </View>
            </Pressable>
            {isOwner && (
              <Pressable onPress={() => onRemoveBook(b.id)} hitSlop={8}>
                <ThemedText variant="caption" color={colors.accent}>Çıkar</ThemedText>
              </Pressable>
            )}
          </View>
        ))}
        {list.books.length === 0 && <ThemedText variant="body" muted>Bu listede henüz kitap yok.</ThemedText>}
      </View>

      {isOwner && <Button title="Listeyi Sil" variant="ghost" onPress={onDeleteList} />}
    </ScrollView>
  );
}
