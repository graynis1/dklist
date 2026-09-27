import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { PenSquareIcon, NewspaperIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getBlogList, type BlogListItem } from "@/api/content";
import { mediaUrl } from "@/lib/media";
import { consumeBlogDirty } from "@/lib/blogRefresh";
import { formatDateTr } from "@/lib/dateTr";

function Author({ b, light }: { b: BlogListItem; light?: boolean }) {
  const { colors } = useTheme();
  const color = light ? "rgba(255,255,255,0.9)" : colors.textMuted;
  if (!b.ownerUsername) return <ThemedText variant="caption" color={color}>{formatDateTr(b.createdDate)}</ThemedText>;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Avatar id={0} name={b.ownerUsername} imageUrl={b.ownerImage} size={22} />
      <ThemedText variant="caption" color={color} numberOfLines={1}>
        {b.ownerUsername} · {formatDateTr(b.createdDate)}
      </ThemedText>
    </View>
  );
}

export default function BloglarScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (q: string) => {
    const s = ++seq.current;
    try {
      const r = await getBlogList(1, q);
      if (s !== seq.current) return;
      setItems(r.items);
      setPage(1);
      setLastPage(r.lastPage);
      setCanWrite(Boolean(r.canWrite));
      setError(null);
    } catch {
      if (s === seq.current) setError("Blog yazıları yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(query).finally(() => setLoading(false));
    }, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  useFocusEffect(
    useCallback(() => {
      if (consumeBlogDirty()) load(query);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  async function loadMore() {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const r = await getBlogList(page + 1, query);
      setItems((prev) => [...prev, ...r.items.filter((i) => !prev.some((p) => p.id === i.id))]);
      setPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }

  const open = (b: BlogListItem) => router.push({ pathname: "/blog/[slug]", params: { slug: b.slug } });
  const [featured, ...rest] = items;
  const showFeatured = !query && featured;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Yazılarda ara…" />
      {showFeatured && (
        <Pressable onPress={() => open(featured)} style={({ pressed }) => ({ borderRadius: radius.xl, overflow: "hidden", opacity: pressed ? 0.9 : 1, ...shadow.md })}>
          {mediaUrl(featured.img) ? (
            <Image source={{ uri: mediaUrl(featured.img)! }} style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: colors.surface }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[colors.accent700, colors.accent400]} style={{ width: "100%", aspectRatio: 4 / 3 }} />
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} locations={[0.35, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: spacing.sm }}>
            <View style={{ alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.accent }}>
              <ThemedText variant="label" color="#fff" style={{ fontSize: 10 }}>Öne çıkan</ThemedText>
            </View>
            <ThemedText variant="headline" color="#fff" style={{ fontSize: 26, lineHeight: 31 }} numberOfLines={3}>{featured.title}</ThemedText>
            <Author b={featured} light />
          </View>
        </Pressable>
      )}
      {items.length > (showFeatured ? 1 : 0) && <ThemedText variant="title" style={{ fontSize: 18, marginTop: spacing.xs }}>{query ? "Sonuçlar" : "Son yazılar"}</ThemedText>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={showFeatured ? rest : items}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110, gap: spacing.md }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(query); setRefreshing(false); }} tintColor={colors.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          ListEmptyComponent={
            showFeatured ? null : (
              <EmptyState icon={<NewspaperIcon size={30} color={colors.accent} />} title={error ? "Bir sorun oluştu" : "Yazı bulunamadı"} subtitle={error ?? (query ? `“${query}” ile eşleşen yazı yok.` : "Henüz yayınlanmış bir yazı yok.")} />
            )
          }
          renderItem={({ item }) => {
            const src = mediaUrl(item.img);
            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.divider, opacity: pressed ? 0.9 : 1, ...shadow.sm })}>
                {src ? (
                  <Image source={{ uri: src }} style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.surface }} resizeMode="cover" />
                ) : null}
                <View style={{ padding: spacing.md, gap: 6 }}>
                  <ThemedText variant="title" style={{ fontSize: 19, lineHeight: 24 }} numberOfLines={2}>{item.title}</ThemedText>
                  {item.preview ? (
                    <ThemedText variant="body" muted numberOfLines={2} style={{ fontSize: 14, lineHeight: 20 }}>{item.preview}</ThemedText>
                  ) : null}
                  <View style={{ marginTop: 2 }}>
                    <Author b={item} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {canWrite && (
        <Pressable
          onPress={() => router.push("/blog/yeni")}
          style={({ pressed }) => ({ position: "absolute", right: spacing.lg, bottom: spacing.xl, flexDirection: "row", alignItems: "center", gap: 8, height: 52, paddingHorizontal: 20, borderRadius: 26, backgroundColor: pressed ? colors.accent700 : colors.accent, ...shadow.lg })}
        >
          <PenSquareIcon size={20} color="#fff" />
          <ThemedText variant="bodySemibold" color="#fff">Yazı Yaz</ThemedText>
        </Pressable>
      )}
    </View>
  );
}
