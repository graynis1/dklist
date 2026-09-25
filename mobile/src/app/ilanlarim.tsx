import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getMyListings, type MyStoreItem } from "@/api/store";

/**
 * Read-only this pass - creating a new listing needs a photo picker +
 * multipart upload, a real next step not built here (see mobile/README.md).
 * Viewing/managing what you already have doesn't need that.
 */
export default function IlanlarimScreen() {
  const { colors, spacing, radius } = useTheme();
  const [listings, setListings] = useState<MyStoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getMyListings();
    if (!ignore?.current) setListings(result.listings);
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
      data={listings}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } })}
          style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, alignItems: "center" }}
        >
          {item.image && <Image source={{ uri: item.image }} style={{ width: 48, height: 48, borderRadius: 8 }} />}
          <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>{item.title}</ThemedText>
          <ThemedText variant="caption" color={colors.accent}>{item.status}</ThemedText>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Henüz ilanın yok.</ThemedText>
        </View>
      }
    />
  );
}
