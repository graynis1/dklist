import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router, useNavigation } from "expo-router";
import { PlusIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@/auth/AuthContext";
import { getStoreList, type StoreListItem } from "@/api/store";

export default function AskidaKitapScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [type, setType] = useState<"free" | "paid" | null>(null);
  const [items, setItems] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/askida-kitap/yeni")} style={{ padding: 4 }}>
          <PlusIcon size={22} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation, profile, colors.accent]);

  const load = useCallback(async (t: "free" | "paid" | null, ignore?: { current: boolean }) => {
    const result = await getStoreList(t);
    if (!ignore?.current) setItems(result.items);
  }, []);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load(type, ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load, type]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", gap: spacing.xs, padding: spacing.lg, paddingBottom: spacing.sm }}>
        {([null, "free", "paid"] as const).map((t) => (
          <Pressable
            key={t ?? "all"}
            onPress={() => setType(t)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: type === t ? colors.accent : colors.divider,
            }}
          >
            <ThemedText variant="caption" color={type === t ? colors.accent : colors.text}>
              {t === null ? "Hepsi" : t === "free" ? "Ücretsiz" : "Satılık"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } })}
              style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}
            >
              {item.image && <Image source={{ uri: item.image }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />}
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="title" numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText variant="caption" muted>@{item.ownerUsername}{item.location ? ` · ${item.location}` : ""}</ThemedText>
                <ThemedText variant="bodySemibold" color={colors.accent}>
                  {item.listingType === "paid" && item.price ? `${item.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}
                </ThemedText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
              <ThemedText variant="body" muted>Henüz ilan yok.</ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}
