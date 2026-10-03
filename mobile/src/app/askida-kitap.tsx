import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl, useWindowDimensions } from "react-native";
import { router, useNavigation } from "expo-router";
import { PlusIcon, TagIcon, MapPinIcon, PinIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ListingThumb } from "@/components/ListingThumb";
import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/auth/AuthContext";
import { getStoreList, type StoreListItem } from "@/api/store";

type TypeFilter = "free" | "paid" | null;

/** Askıda Kitap - customer: "arama yok, sitede olduğu gibi aramalar eklenmeli". */
export default function AskidaKitapScreen() {
  const { colors, spacing, radius } = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [type, setType] = useState<TypeFilter>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!profile) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/askida-kitap/yeni")} hitSlop={8} style={{ padding: 4 }}>
          <PlusIcon size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, profile, colors.text]);

  const load = useCallback(async (t: TypeFilter, q: string) => {
    const mySeq = ++seq.current;
    try {
      const result = await getStoreList(t, q.trim());
      if (mySeq === seq.current) setItems(result.items);
    } catch {
      // keep current results
    } finally {
      if (mySeq === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(type, query), query ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, type, query]);

  const colW = Math.floor((width - spacing.lg * 2 - spacing.md) / 2);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Kitap veya ilan ara…" />
        <View style={{ flexDirection: "row", gap: 6, paddingBottom: spacing.sm }}>
          {([null, "free", "paid"] as const).map((t) => {
            const on = type === t;
            return (
              <Pressable key={t ?? "all"} onPress={() => setType(t)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200 }}>
                <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{t === null ? "Hepsi" : t === "free" ? "Ücretsiz" : "Satılık"}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing["3xl"], gap: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(type, query); setRefreshing(false); }} tintColor={colors.accent} />}
          ListEmptyComponent={
            <EmptyState
              icon={<TagIcon size={30} color={colors.accent} />}
              title={query ? "İlan bulunamadı" : "Henüz ilan yok"}
              subtitle={query ? `“${query}” için bir ilan yok.` : "Okuduğun kitapları askıya bırakarak başkalarına ulaştır."}
              actionLabel={profile ? "İlan Ver" : undefined}
              onAction={() => router.push("/askida-kitap/yeni")}
            />
          }
          renderItem={({ item }) => {
            return (
              <Pressable onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } })} style={({ pressed }) => ({ width: colW, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.card, borderWidth: item.isPinned ? 2 : 0, borderColor: colors.accent, opacity: pressed ? 0.85 : 1 })}>
                <ListingThumb image={item.image} bookId={item.bookId} bookHasImage={item.bookHasImage} title={item.title} height={colW} />
                {item.isPinned && (
                  <View style={{ position: "absolute", top: 6, left: 6, flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: colors.accent }}>
                    <PinIcon size={10} color="#fff" />
                    <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, fontWeight: "700" }}>Öne çıkan</ThemedText>
                  </View>
                )}
                <View style={{ padding: spacing.sm, gap: 2 }}>
                  <ThemedText variant="bodySemibold" color={colors.accent700} style={{ fontSize: 15.5 }}>
                    {item.listingType === "paid" && item.price ? `${item.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}
                  </ThemedText>
                  <ThemedText variant="body" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 18 }}>{item.title}</ThemedText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                    {item.location ? <MapPinIcon size={11} color={colors.textMuted} /> : null}
                    <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, flex: 1 }}>{item.location || item.ownerUsername}</ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
