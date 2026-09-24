import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getFavorites, type FavoritesResponse } from "@/api/favorites";

export default function FavorilerScreen() {
  const { colors, spacing } = useTheme();
  const [data, setData] = useState<FavoritesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getFavorites();
    if (!ignore?.current) setData(result);
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

  const sections: { title: string; items: FavoritesResponse["writers"]; hrefBase: "/yazar/[slug]" | "/cevirmen/[slug]" | "/yayinevi/[slug]" }[] = data
    ? [
        { title: "Yazarlar", items: data.writers, hrefBase: "/yazar/[slug]" },
        { title: "Çevirmenler", items: data.translators, hrefBase: "/cevirmen/[slug]" },
        { title: "Yayınevleri", items: data.publishers, hrefBase: "/yayinevi/[slug]" },
      ]
    : [];
  const hasAny = sections.some((s) => s.items.length > 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {!hasAny && (
        <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
          <ThemedText variant="body" muted>Henüz beğendiğin bir yazar, çevirmen veya yayınevi yok.</ThemedText>
        </View>
      )}
      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <View key={section.title} style={{ gap: spacing.sm }}>
              <ThemedText variant="label" color={colors.textMuted}>{section.title}</ThemedText>
              {section.items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push({ pathname: section.hrefBase, params: { slug: item.slug } })}
                  style={{ paddingVertical: spacing.xs }}
                >
                  <ThemedText variant="body">{item.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          ),
      )}
    </ScrollView>
  );
}
