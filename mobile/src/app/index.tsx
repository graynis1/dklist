import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, RefreshControl, Pressable, ScrollView, ActivityIndicator, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BellIcon, SearchIcon, MessageCircleIcon, ImageIcon, BookIcon, ScanBarcodeIcon, PlusIcon, RssIcon, WifiOffIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { FeedGroupCard } from "@/components/FeedCard";
import { getFeed, type FeedItem } from "@/api/feed";
import { getNotifications } from "@/api/notifications";
import { groupFeed, matchesFilter, type FeedFilter } from "@/lib/feedGroups";
import { resolveFeedTargetHref } from "@/lib/feedNav";
import { consumeFeedDirty } from "@/lib/feedRefresh";
import { API_BASE_URL } from "@/api/config";

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "posts", label: "Gönderiler" },
  { key: "reading", label: "Okumalar" },
  { key: "community", label: "Topluluk" },
];

function HeaderButton({ onPress, children, badge }: { onPress: () => void; children: React.ReactNode; badge?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.neutral300 : colors.neutral200, alignItems: "center", justifyContent: "center" })}>
      {children}
      {badge != null && badge > 0 && (
        <View style={{ position: "absolute", top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: "#d93025", borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, lineHeight: 12, fontWeight: "700" }}>{badge > 9 ? "9+" : badge}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

function SkeletonCard() {
  const { colors, spacing } = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bar = (w: number | `${number}%`, h = 12) => <View style={{ width: w, height: h, borderRadius: 6, backgroundColor: colors.neutral200 }} />;
  return (
    <Animated.View style={{ opacity: pulse, backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.neutral200 }} />
        <View style={{ gap: 6, flex: 1 }}>
          {bar("40%")}
          {bar("60%", 10)}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, padding: spacing.sm, borderRadius: 8, backgroundColor: colors.neutral100 }}>
        <View style={{ width: 52, height: 76, borderRadius: 5, backgroundColor: colors.neutral200 }} />
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          {bar("70%", 14)}
          {bar("35%", 10)}
        </View>
      </View>
    </Animated.View>
  );
}

export default function AkisScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { profile } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const listRef = useRef<FlatList>(null);

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await getFeed();
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch {
      setError("Akış yüklenemedi. İnternet bağlantını kontrol et.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage().finally(() => setLoading(false));
  }, [loadFirstPage]);

  useFocusEffect(
    useCallback(() => {
      getNotifications()
        .then((r) => setUnreadCount(r.unreadCount))
        .catch(() => {});
      if (consumeFeedDirty()) {
        loadFirstPage();
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    }, [loadFirstPage]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getFeed(nextCursor);
      setItems((prev) => {
        const known = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !known.has(i.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      // keep what we have; the next scroll retries
    } finally {
      setLoadingMore(false);
    }
  }

  const groups = useMemo(() => groupFeed(items.filter((i) => matchesFilter(i, filter))), [items, filter]);

  // "Şu an okunanlar" - a stories-style strip of what people just started reading.
  const nowReading = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((i) => {
      if (i.reason !== "reading_status" || i.readStatus !== "currentRead" || !i.bookCover) return false;
      const k = `${i.actorId}-${i.bookCover.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [items]);

  const firstName = profile?.name?.split(" ")[0] ?? profile?.username ?? "";
  const STORY_W = 104;
  const STORY_H = 168;

  const header = (
    <View>
      {/* Composer */}
      <View style={{ backgroundColor: colors.card, paddingTop: spacing.md, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {profile && (
            <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username: profile.username } })}>
              <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={42} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push("/gonderi-yeni")}
            style={({ pressed }) => ({ flex: 1, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.neutral200 : colors.neutral100, justifyContent: "center", paddingHorizontal: 16 })}
          >
            <ThemedText variant="body" muted numberOfLines={1}>Ne okuyorsun, {firstName}?</ThemedText>
          </Pressable>
        </View>
        <View style={{ height: 1, backgroundColor: colors.divider, marginTop: spacing.md }} />
        <View style={{ flexDirection: "row", paddingVertical: 4, paddingHorizontal: spacing.sm }}>
          {[
            { key: "photo", label: "Fotoğraf", Icon: ImageIcon, tint: "#3f8a5a", onPress: () => router.push({ pathname: "/gonderi-yeni", params: { action: "photo" } }) },
            { key: "book", label: "Kitap", Icon: BookIcon, tint: colors.accent, onPress: () => router.push({ pathname: "/gonderi-yeni", params: { action: "book" } }) },
            { key: "scan", label: "Barkod", Icon: ScanBarcodeIcon, tint: "#2f5d8a", onPress: () => router.push("/barkod") },
          ].map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
            >
              <a.Icon size={20} color={a.tint} />
              <ThemedText variant="bodySemibold" color={colors.textMuted} style={{ fontSize: 13.5 }}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Now reading strip */}
      <View style={{ backgroundColor: colors.card, paddingVertical: spacing.md, marginBottom: 8, gap: spacing.sm }}>
        <ThemedText variant="title" style={{ paddingHorizontal: spacing.lg, fontSize: 16.5 }}>Şu an okunanlar</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Pressable onPress={() => router.push("/kitapligim")} style={{ width: STORY_W, height: STORY_H, borderRadius: 12, overflow: "hidden", backgroundColor: colors.neutral100, borderWidth: 1, borderColor: colors.divider }}>
            <View style={{ height: STORY_H * 0.62, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent100 }}>
              {profile && <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={58} />}
            </View>
            <View style={{ position: "absolute", top: STORY_H * 0.62 - 17, alignSelf: "center", width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, borderWidth: 3, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <PlusIcon size={18} color="#fff" strokeWidth={3} />
            </View>
            <View style={{ flex: 1, justifyContent: "flex-end", padding: 8 }}>
              <ThemedText variant="bodySemibold" style={{ fontSize: 12.5, textAlign: "center" }} numberOfLines={2}>Ne okuyorsun?</ThemedText>
            </View>
          </Pressable>
          {nowReading.map((i) => {
            const href = resolveFeedTargetHref(i);
            return (
              <Pressable key={i.id} onPress={() => href && router.push(href)} style={{ width: STORY_W, height: STORY_H, borderRadius: 12, overflow: "hidden", ...shadow.sm }}>
                <BookCover id={i.bookCover!.id} title={i.targetLabel ?? ""} width={STORY_W} height={STORY_H} imageUrl={i.bookCover!.hasImage ? `${API_BASE_URL}/kapak/${i.bookCover!.id}` : null} />
                <LinearGradient colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.75)"]} locations={[0, 0.4, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <View style={{ position: "absolute", top: 8, left: 8, borderRadius: 20, borderWidth: 2.5, borderColor: colors.accent400 }}>
                  <Avatar id={i.actorId} name={i.actorUsername} imageUrl={i.actorImage} size={32} />
                </View>
                <View style={{ position: "absolute", left: 8, right: 8, bottom: 8 }}>
                  <ThemedText variant="bodySemibold" color="#fff" numberOfLines={1} style={{ fontSize: 12.5 }}>{i.actorUsername}</ThemedText>
                  <ThemedText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1} style={{ fontSize: 10.5 }}>{i.targetLabel}</ThemedText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, alignItems: "center" }}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ paddingVertical: 7, paddingHorizontal: 15, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.divider }}>
              <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{f.label}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
        <Pressable onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} style={{ flex: 1 }}>
          <ThemedText variant="display" color={colors.accent} style={{ fontSize: 30 }}>dklist</ThemedText>
        </Pressable>
        <HeaderButton onPress={() => router.push("/kesfet")}>
          <SearchIcon size={20} color={colors.text} />
        </HeaderButton>
        <HeaderButton onPress={() => router.push("/bildirimler")} badge={unreadCount}>
          <BellIcon size={20} color={colors.text} />
        </HeaderButton>
        <HeaderButton onPress={() => router.replace("/mesajlar")}>
          <MessageCircleIcon size={20} color={colors.text} />
        </HeaderButton>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {loading ? (
          <ScrollView scrollEnabled={false}>
            {header}
            <SkeletonCard />
            <SkeletonCard />
          </ScrollView>
        ) : error && items.length === 0 ? (
          <EmptyState icon={<WifiOffIcon size={30} color={colors.accent} />} title="Bağlantı sorunu" subtitle={error} actionLabel="Tekrar Dene" onAction={onRefresh} />
        ) : (
          <FlatList
            ref={listRef}
            data={groups}
            keyExtractor={(g) => g.key}
            renderItem={({ item }) => <FeedGroupCard group={item} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={header}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            removeClippedSubviews
            ListFooterComponent={
              loadingMore ? (
                <View style={{ padding: spacing.lg }}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : groups.length > 0 && !nextCursor ? (
                <View style={{ alignItems: "center", padding: spacing.xl, gap: 4 }}>
                  <RssIcon size={20} color={colors.neutral400} />
                  <ThemedText variant="caption" muted>Hepsi bu kadar — yeni etkinlikler için aşağı çek.</ThemedText>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon={<RssIcon size={30} color={colors.accent} />}
                title={filter === "all" ? "Akış henüz boş" : "Bu filtrede içerik yok"}
                subtitle={filter === "all" ? "Okurları takip et ya da ilk gönderini paylaş." : "Başka bir filtre seçmeyi dene."}
                actionLabel={filter === "all" ? "Gönderi Paylaş" : "Tümünü Göster"}
                onAction={() => (filter === "all" ? router.push("/gonderi-yeni") : setFilter("all"))}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
