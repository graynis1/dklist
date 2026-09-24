import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { getMyLists, createList, type UserListSummary } from "@/api/lists";

export default function ListelerimScreen() {
  const { colors, spacing, radius } = useTheme();
  const [lists, setLists] = useState<UserListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getMyLists();
    if (!ignore?.current) setLists(result.lists);
  }, []);

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

  async function onCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const result = await createList(trimmed);
      setTitle("");
      setShowForm(false);
      await load();
      router.push({ pathname: "/liste/[slug]", params: { slug: result.slug } });
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={lists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/liste/[slug]", params: { slug: item.slug } })}
            style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}
          >
            <ThemedText variant="title">{item.title}</ThemedText>
            <ThemedText variant="caption" muted>
              {item.bookCount} kitap · {item.isPublic ? "Herkese açık" : "Gizli"}
            </ThemedText>
          </Pressable>
        )}
        ListHeaderComponent={
          showForm ? (
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <TextField label="Liste Başlığı" value={title} onChangeText={setTitle} placeholder="Örn. Yılın en iyi 10 kitabı" />
              <Button title="Oluştur" onPress={onCreate} disabled={creating || !title.trim()} block />
            </View>
          ) : (
            <Button title="+ Yeni Liste" variant="secondary" onPress={() => setShowForm(true)} block style={{ marginBottom: spacing.md }} />
          )
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
            <ThemedText variant="body" muted>Henüz bir listen yok.</ThemedText>
          </View>
        }
      />
    </View>
  );
}
