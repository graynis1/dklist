import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { View, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getFavorites, type FavoritesResponse } from "@/api/favorites";

export default function FavorilerScreen() {
  const { colors, spacing, radius } = useTheme();
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
  const stores = data?.stores ?? [];
  const hasAny = sections.some((s) => s.items.length > 0) || stores.length > 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {!hasAny && (
        <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
          <ThemedText variant="body" muted>Henüz favorilediğin bir şey yok.</ThemedText>
        </View>
      )}

      {stores.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" color={colors.textMuted}>İlanlar</ThemedText>
          {stores.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } })}
              style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}
            >
              {item.image && <Image source={{ uri: mediaUrl(item.image)! }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />}
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="title" numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText variant="caption" muted>{item.location ?? ""}</ThemedText>
                <ThemedText variant="bodySemibold" color={colors.accent}>
                  {item.listingType === "paid" && item.price ? `${item.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}
                </ThemedText>
              </View>
            </Pressable>
          ))}
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
