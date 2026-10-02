import { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { ListIcon, PlusIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getPublicLists, type PublicList } from "@/api/discover";

/** Everyone's public reading lists (web /listeler). */
export default function ListelerScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [lists, setLists] = useState<PublicList[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLists((await getPublicLists()).lists);
    } catch {
      // pull to retry
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return lists;
    return lists.filter((l) => l.title.toLocaleLowerCase("tr-TR").includes(q) || l.ownerUsername.toLocaleLowerCase("tr-TR").includes(q));
  }, [lists, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["3xl"] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Liste veya kullanıcı ara…" />
              <Pressable onPress={() => router.push("/listelerim")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent200 : colors.accent100 })}>
                <PlusIcon size={18} color={colors.accent800} />
                <ThemedText variant="bodySemibold" color={colors.accent800} style={{ flex: 1 }}>Kendi listeni oluştur</ThemedText>
                <ChevronRightIcon size={18} color={colors.accent800} />
              </Pressable>
            </View>
          }
          ListEmptyComponent={<EmptyState icon={<ListIcon size={30} color={colors.accent} />} title={query ? "Sonuç yok" : "Henüz herkese açık liste yok"} subtitle={query ? undefined : "İlk listeyi sen oluştur, okurlar keşfetsin."} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: "/liste/[slug]", params: { slug: item.slug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
              <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                <ListIcon size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="title" numberOfLines={1}>{item.title}</ThemedText>
                {item.description ? <ThemedText variant="caption" muted numberOfLines={2}>{item.description}</ThemedText> : null}
                <ThemedText variant="caption" color={colors.accent700}>{item.bookCount} kitap · {item.ownerUsername}</ThemedText>
              </View>
              <ChevronRightIcon size={18} color={colors.neutral400} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
