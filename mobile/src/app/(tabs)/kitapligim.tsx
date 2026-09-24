import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { getLibrary, type LibraryByStatus, type ReadStatus } from "@/api/library";

const TABS: { key: ReadStatus; label: string }[] = [
  { key: "currentRead", label: "Okuyorum" },
  { key: "finishRead", label: "Okudum" },
  { key: "targetRead", label: "Okuyacağım" },
  { key: "dropRead", label: "Yarıda Bıraktım" },
];

export default function KitapligimScreen() {
  const { colors, spacing, radius } = useTheme();
  const [library, setLibrary] = useState<LibraryByStatus | null>(null);
  const [active, setActive] = useState<ReadStatus>("currentRead");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    try {
      const result = await getLibrary();
      if (!ignore?.current) {
        setLibrary(result);
        setError(null);
      }
    } catch {
      if (!ignore?.current) setError("Kitaplığın yüklenemedi.");
    }
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

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const items = library?.[active] ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <ThemedText variant="display">Kitaplığım</ThemedText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm }}>
        {TABS.map((t) => {
          const isActive = active === t.key;
          const count = library?.[t.key]?.length ?? 0;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActive(t.key)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: isActive ? colors.accent : colors.divider,
                backgroundColor: isActive ? `${colors.accent}1F` : "transparent",
              }}
            >
              <ThemedText variant="bodySemibold" color={isActive ? colors.accent : colors.text}>
                {t.label}
                {count > 0 ? ` (${count})` : ""}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"] }}>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>
            {error}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          columnWrapperStyle={{ gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1, gap: spacing.xs }} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
              <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={104} height={152} />
              <ThemedText variant="caption" numberOfLines={2}>
                {item.name}
              </ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
              <ThemedText variant="body" muted>
                Bu rafta henüz kitap yok.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
