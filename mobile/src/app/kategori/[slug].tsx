import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { getCategory, type CategoryBookItem } from "@/api/category";

export default function KategoriDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [items, setItems] = useState<CategoryBookItem[]>([]);
  const [sort, setSort] = useState<"viewCount" | "score">("viewCount");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: "viewCount" | "score", ignore?: { current: boolean }) => {
    try {
      const result = await getCategory(slug, 1, s);
      if (!ignore?.current) {
        setItems(result.items);
        setError(null);
        navigation.setOptions({ title: result.category.name });
      }
    } catch {
      if (!ignore?.current) setError("Bu kategori şu anda yüklenemedi.");
    }
  }, [slug, navigation]);

  useEffect(() => {
    const ignore = { current: false };
    // Same react-hooks/set-state-in-effect false positive documented in
    // AuthContext.tsx - a sort-change refetch needs to reset loading
    // synchronously before the async call starts, not after.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load(sort, ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load, sort]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", gap: spacing.xs, padding: spacing.lg, paddingBottom: spacing.sm }}>
        {(["viewCount", "score"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSort(s)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: sort === s ? colors.accent : colors.divider,
            }}
          >
            <ThemedText variant="caption" color={sort === s ? colors.accent : colors.text}>
              {s === "viewCount" ? "Popülerlik" : "Puan"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"] }}>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          columnWrapperStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <Pressable style={{ flex: 1, gap: spacing.xs }} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
              <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={104} height={152} hasImage={item.hasImage} />
              <ThemedText variant="caption" numberOfLines={2}>{item.name}</ThemedText>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
