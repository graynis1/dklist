import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image, RefreshControl } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { PlayIcon, PlayCircleIcon, EyeIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getVideoList, type VideoListItem } from "@/api/content";
import { formatDateTr } from "@/lib/dateTr";
import { videoThumb } from "@/lib/videoThumb";

function views(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}B görüntülenme` : `${n} görüntülenme`;
}

export default function VideolarScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [items, setItems] = useState<VideoListItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (q: string) => {
    const s = ++seq.current;
    try {
      const r = await getVideoList(1, q);
      if (s !== seq.current) return;
      setItems(r.items);
      setPage(1);
      setLastPage(r.lastPage);
      setError(null);
    } catch {
      if (s === seq.current) setError("Videolar yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(query).finally(() => setLoading(false));
    }, query ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  async function loadMore() {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const r = await getVideoList(page + 1, query);
      setItems((prev) => [...prev, ...r.items.filter((i) => !prev.some((p) => p.id === i.id))]);
      setPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }

  const open = (v: VideoListItem) => router.push({ pathname: "/video/[slug]", params: { slug: v.slug } });
  const [featured, ...rest] = items;
  const showFeatured = !query && featured;

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Videolarda ara…" />
      {showFeatured && (
        <Pressable onPress={() => open(featured)} style={({ pressed }) => ({ borderRadius: radius.xl, overflow: "hidden", backgroundColor: "#000", opacity: pressed ? 0.9 : 1, ...shadow.md })}>
          {videoThumb(featured.youtubeVideoId) ? (
            <Image source={{ uri: videoThumb(featured.youtubeVideoId)! }} style={{ width: "100%", aspectRatio: 16 / 9 }} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[colors.accent800, colors.accent500]} style={{ width: "100%", aspectRatio: 16 / 9 }} />
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} locations={[0.4, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(0,0,0,0.55)", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
              <PlayIcon size={30} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
            </View>
          </View>
          <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.md, gap: 4 }}>
            <View style={{ alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: "#d93025" }}>
              <ThemedText variant="label" color="#fff" style={{ fontSize: 10 }}>Yeni video</ThemedText>
            </View>
            <ThemedText variant="headline" color="#fff" style={{ fontSize: 22, lineHeight: 27 }} numberOfLines={2}>{featured.title}</ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)">{views(featured.viewCount)} · {formatDateTr(featured.createdDate)}</ThemedText>
          </View>
        </Pressable>
      )}
      {items.length > (showFeatured ? 1 : 0) && <ThemedText variant="title" style={{ fontSize: 18, marginTop: spacing.xs }}>{query ? "Sonuçlar" : "Tüm videolar"}</ThemedText>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing["3xl"] }} />
      ) : (
        <FlatList
          data={showFeatured ? rest : items}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.md }}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(query); setRefreshing(false); }} tintColor={colors.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
          ListEmptyComponent={
            showFeatured ? null : (
              <EmptyState icon={<PlayCircleIcon size={30} color={colors.accent} />} title={error ? "Bir sorun oluştu" : "Video bulunamadı"} subtitle={error ?? (query ? `“${query}” ile eşleşen video yok.` : "Henüz video eklenmemiş.")} />
            )
          }
          renderItem={({ item }) => {
            const thumb = videoThumb(item.youtubeVideoId, false);
            return (
              <Pressable onPress={() => open(item)} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
                <View style={{ width: 150, aspectRatio: 16 / 9, borderRadius: radius.md, overflow: "hidden", backgroundColor: "#000" }}>
                  {thumb && <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
                  <View style={{ position: "absolute", right: 5, bottom: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" }}>
                    <PlayIcon size={12} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                  </View>
                </View>
                <View style={{ flex: 1, gap: 4, justifyContent: "center" }}>
                  <ThemedText variant="bodySemibold" numberOfLines={3} style={{ fontSize: 14, lineHeight: 19 }}>{item.title}</ThemedText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <EyeIcon size={11} color={colors.textMuted} />
                    <ThemedText variant="caption" muted style={{ fontSize: 11.5 }}>{views(item.viewCount)}</ThemedText>
                  </View>
                  <ThemedText variant="caption" muted style={{ fontSize: 11.5 }}>{formatDateTr(item.createdDate)}</ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
