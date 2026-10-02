import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl, useWindowDimensions, ScrollView } from "react-native";
import { router } from "expo-router";
import { BookOpenIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getBooks, type BookListItem, type BookSort } from "@/api/discover";

const SORTS: { key: BookSort; label: string }[] = [
  { key: "viewCount", label: "Popüler" },
  { key: "score", label: "En Yüksek Puan" },
  { key: "name", label: "A → Z" },
];

/** Customer: "Kitaplara direk gidilmiyor" - the whole catalog, browsable
 * like web /kitaplar, with search, sorting and endless scrolling. */
export default function KitaplarScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const [items, setItems] = useState<BookListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [sort, setSort] = useState<BookSort>("viewCount");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (s: BookSort, q: string) => {
    const mySeq = ++seq.current;
    try {
      const r = await getBooks(1, s, q.trim().length >= 2 ? q.trim() : "");
      if (mySeq !== seq.current) return;
      setItems(r.items);
      setPage(1);
      setLastPage(r.lastPage);
      setError(null);
    } catch (err) {
      if (mySeq === seq.current) setError(err instanceof Error ? err.message : "Kitaplar yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(sort, query).finally(() => setLoading(false));
    }, query ? 400 : 0);
    return () => clearTimeout(t);
  }, [sort, query, load]);

  async function loadMore() {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const r = await getBooks(page + 1, sort, query.trim().length >= 2 ? query.trim() : "");
      setItems((prev) => [...prev, ...r.items.filter((i) => !prev.some((p) => p.id === i.id))]);
      setPage(page + 1);
    } catch {
      // next scroll retries
    } finally {
      setLoadingMore(false);
    }
  }

  const gap = spacing.md;
  const tileW = Math.floor((width - spacing.lg * 2 - gap * 2) / 3);
  const coverW = tileW;
  const coverH = Math.round(coverW * 1.48);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, backgroundColor: colors.bg }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Kitap adıyla ara…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingBottom: spacing.sm, alignItems: "center" }}>
          {SORTS.map((s) => {
            const on = sort === s.key;
            return (
              <Pressable key={s.key} onPress={() => setSort(s.key)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200 }}>
                <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{s.label}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.id)}
          numColumns={3}
          columnWrapperStyle={{ gap, paddingHorizontal: spacing.lg }}
          contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing["3xl"], gap: spacing.lg }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(sort, query); setRefreshing(false); }} tintColor={colors.accent} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={<BookOpenIcon size={30} color={colors.accent} />}
              title={error ? "Bir sorun oluştu" : "Kitap bulunamadı"}
              subtitle={error ?? (query ? `“${query}” ile başlayan bir kitap yok. Kataloğa ekleyebilirsin.` : undefined)}
              actionLabel={error ? "Tekrar Dene" : query ? "Kitap Ekle" : undefined}
              onAction={error ? () => load(sort, query) : () => router.push({ pathname: "/kitap/yeni", params: { name: query } })}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })} style={({ pressed }) => ({ width: tileW, gap: 6, opacity: pressed ? 0.8 : 1 })}>
              <View style={{ borderRadius: 5, ...shadow.sm }}>
                <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={coverW} height={coverH} hasImage={item.hasImage} score={item.score} />
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
