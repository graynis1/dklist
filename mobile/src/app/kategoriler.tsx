import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getCategories, type TopCategory } from "@/api/category";

export default function KategorilerScreen() {
  const { colors, spacing, radius } = useTheme();
  const [categories, setCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getCategories();
    if (!ignore?.current) setCategories(result.categories);
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={categories}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/kategori/[slug]", params: { slug: item.slug } })}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.divider,
          }}
        >
          <ThemedText variant="body">{item.name}</ThemedText>
          <ThemedText variant="caption" muted>{item.bookCount.toLocaleString("tr-TR")}</ThemedText>
        </Pressable>
      )}
    />
  );
}
