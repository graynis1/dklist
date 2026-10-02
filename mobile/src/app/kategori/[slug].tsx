import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { LayoutGridIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getCategory, type CategoryBookItem } from "@/api/category";

type Sort = "viewCount" | "score";

/** Customer: categories stopped after the first page, had no search and no
 * visible ratings - now endless scrolling, in-category search, rating badges. */
export default function KategoriDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [items, setItems] = useState<CategoryBookItem[]>([]);
  const [sort, setSort] = useState<Sort>("viewCount");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const searching = query.trim().length >= 2;

  const load = useCallback(
    async (s: Sort, q: string) => {
      const mySeq = ++seq.current;
      setLoading(true);
      try {
        const result = await getCategory(slug, 1, s, q.trim().length >= 2 ? q.trim() : "");
        if (mySeq !== seq.current) return;
        setItems(result.items);
        setPage(1);
        setLastPage(result.lastPage);
        setTotal(result.total);
        setError(null);
        navigation.setOptions({ title: result.category.name });
      } catch {
        if (mySeq === seq.current) setError("Bu kategori şu anda yüklenemedi.");
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    },
    [slug, navigation],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(sort, query), query ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, sort, query]);

  async function loadMore() {
    if (searching || loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const result = await getCategory(slug, page + 1, sort);
      setItems((prev) => [...prev, ...result.items.filter((i) => !prev.some((p) => p.id === i.id))]);
      setPage(page + 1);
    } catch {
      // next scroll retries
    } finally {
      setLoadingMore(false);
    }
  }

  const gap = spacing.md;
  const tileW = Math.floor((width - spacing.lg * 2 - gap * 2) / 3);
  const coverH = Math.round(tileW * 1.48);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Bu kategoride ara…" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: spacing.sm }}>
          {(["viewCount", "score"] as const).map((s) => {
            const on = sort === s;
            return (
              <Pressable key={s} disabled={searching} onPress={() => setSort(s)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200, opacity: searching ? 0.5 : 1 }}>
                <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{s === "viewCount" ? "Popüler" : "En Yüksek Puan"}</ThemedText>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          {!loading && !error && (
            <ThemedText variant="caption" muted>{searching ? `${items.length} sonuç` : `${total.toLocaleString("tr-TR")} kitap`}</ThemedText>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <EmptyState icon={<LayoutGridIcon size={30} color={colors.accent} />} title="Bir sorun oluştu" subtitle={error} actionLabel="Tekrar Dene" onAction={() => load(sort, query)} />
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          columnWrapperStyle={{ gap, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing["3xl"], gap: spacing.lg }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          ListEmptyComponent={<EmptyState icon={<LayoutGridIcon size={30} color={colors.accent} />} title="Kitap bulunamadı" subtitle={searching ? `“${query}” ile başlayan bir kitap yok.` : undefined} />}
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => ({ width: tileW, gap: 6, opacity: pressed ? 0.8 : 1 })} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
              <View style={{ borderRadius: 5, ...shadow.sm }}>
                <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={tileW} height={coverH} hasImage={item.hasImage} score={item.score} />
              </View>
              <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{item.name}</ThemedText>
              {item.writers.length > 0 && (
                <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: -4 }}>{item.writers.join(", ")}</ThemedText>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
