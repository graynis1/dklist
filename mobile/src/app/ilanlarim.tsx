import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router, useNavigation, useFocusEffect } from "expo-router";
import { PlusIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getMyListings, type MyStoreItem } from "@/api/store";

export default function IlanlarimScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const [listings, setListings] = useState<MyStoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getMyListings();
    if (!ignore?.current) setListings(result.listings);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/askida-kitap/yeni")} style={{ padding: 4 }}>
          <PlusIcon size={22} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation, colors.accent]);

  // Refreshes on mount AND every time this screen regains focus - covers
  // returning from /askida-kitap/yeni (a new listing) or from a listing's
  // own detail screen (status might have changed there), not just the
  // first load.
  useFocusEffect(
    useCallback(() => {
      const ignore = { current: false };
      load(ignore).finally(() => {
        if (!ignore.current) setLoading(false);
      });
      return () => {
        ignore.current = true;
      };
    }, [load]),
  );

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
