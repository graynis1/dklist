import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, RefreshControl, Pressable, ScrollView, ActivityIndicator, Animated, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BellIcon, SearchIcon, MessageCircleIcon, ImageIcon, ScanBarcodeIcon, PlusIcon, RssIcon, WifiOffIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { FeedGroupCard } from "@/components/FeedCard";
import { Chip } from "@/components/ui";
import { getFeed, type FeedItem } from "@/api/feed";
import { getNotifications } from "@/api/notifications";
import { groupFeed, matchesFilter, type FeedFilter } from "@/lib/feedGroups";
import { resolveFeedTargetHref } from "@/lib/feedNav";
import { consumeFeedDirty } from "@/lib/feedRefresh";
import { onTabReselect } from "@/lib/tabEvents";
import { API_BASE_URL } from "@/api/config";

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "posts", label: "Gönderiler" },
  { key: "reading", label: "Okumalar" },
  { key: "community", label: "Topluluk" },
];

function HeaderButton({ onPress, children, badge, label }: { onPress: () => void; children: React.ReactNode; badge?: number; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityLabel={label} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.neutral200 : "transparent", alignItems: "center", justifyContent: "center" })}>
      {children}
      {badge != null && badge > 0 && (
        <View style={{ position: "absolute", top: 3, right: 1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: "#e0393e", borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <ThemedText variant="caption" color="#fff" style={{ fontSize: 9.5, lineHeight: 11, fontWeight: "700" }}>{badge > 9 ? "9+" : badge}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/** Instagram-style story bubble: reader's avatar in a bronze ring with the book they started as a corner badge. */
function StoryBubble({ item }: { item: FeedItem }) {
  const { colors } = useTheme();
  const href = resolveFeedTargetHref(item);
  return (
    <Pressable onPress={() => href && router.push(href)} style={({ pressed }) => ({ width: 72, alignItems: "center", gap: 5, opacity: pressed ? 0.7 : 1 })}>
      <View>
        <LinearGradient colors={[colors.accent400, colors.accent700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 61, height: 61, borderRadius: 31, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
            <Avatar id={item.actorId} name={item.actorUsername} imageUrl={item.actorImage} size={55} />
          </View>
        </LinearGradient>
        <View style={{ position: "absolute", right: -4, bottom: -2, borderRadius: 3, borderWidth: 2, borderColor: colors.card, overflow: "hidden" }}>
          <BookCover id={item.bookCover!.id} title={item.targetLabel ?? ""} width={22} height={32} imageUrl={item.bookCover!.hasImage ? `${API_BASE_URL}/kapak/${item.bookCover!.id}` : null} />
        </View>
      </View>
      <ThemedText variant="caption" numberOfLines={1} style={{ fontSize: 11.5, maxWidth: 72 }}>{item.actorUsername}</ThemedText>
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
  const { colors, spacing } = useTheme();
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

  // Tapping "Akış" again while already on it jumps back to the top.
  useEffect(
    () =>
      onTabReselect((href) => {
        if (href === "/") listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }),
    [],
  );

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

  const header = (
    <View>
      {/* Composer - one row, shortcuts inside it */}
      <View style={{ backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {profile && (
          <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username: profile.username } })}>
            <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={40} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push("/gonderi-yeni")}
          style={({ pressed }) => ({ flex: 1, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.neutral300 : colors.neutral200, justifyContent: "center", paddingHorizontal: 16 })}
        >
          <ThemedText variant="body" muted numberOfLines={1} style={{ fontSize: 14.5 }}>Ne okuyorsun, {firstName}?</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: "/gonderi-yeni", params: { action: "photo" } })} hitSlop={6} accessibilityLabel="Fotoğraf paylaş" style={{ padding: 4 }}>
          <ImageIcon size={23} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => router.push("/barkod")} hitSlop={6} accessibilityLabel="Barkod tara" style={{ padding: 4 }}>
          <ScanBarcodeIcon size={23} color={colors.text} />
        </Pressable>
      </View>

      {/* Now reading - compact story rings */}
      <View style={{ backgroundColor: colors.card, paddingTop: spacing.xs, paddingBottom: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
          <Pressable onPress={() => router.push({ pathname: "/gonderi-yeni", params: { action: "book" } })} style={({ pressed }) => ({ width: 72, alignItems: "center", gap: 5, opacity: pressed ? 0.7 : 1 })}>
            <View>
              <View style={{ width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" }}>
                {profile && <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={60} />}
              </View>
              <View style={{ position: "absolute", right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                <PlusIcon size={13} color="#fff" strokeWidth={3} />
              </View>
            </View>
            <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11.5 }}>Okuduğun</ThemedText>
          </Pressable>
          {nowReading.map((i) => <StoryBubble key={i.id} item={i} />)}
        </ScrollView>
      </View>

      {/* Filters */}
      <View style={{ backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 10, alignItems: "center" }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: spacing.lg, paddingRight: spacing.sm, height: 52, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider }}>
        <Pressable onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} style={{ flex: 1 }}>
          <ThemedText variant="brand" color={colors.accent} style={{ fontSize: 32, marginTop: -4 }}>dklist</ThemedText>
        </Pressable>
        <HeaderButton label="Ara" onPress={() => router.push("/kesfet")}>
          <SearchIcon size={23} color={colors.text} strokeWidth={2} />
        </HeaderButton>
        <HeaderButton label="Bildirimler" onPress={() => router.push("/bildirimler")} badge={unreadCount}>
          <BellIcon size={23} color={colors.text} strokeWidth={2} />
        </HeaderButton>
        <HeaderButton label="Mesajlar" onPress={() => router.replace("/mesajlar")}>
          <MessageCircleIcon size={23} color={colors.text} strokeWidth={2} />
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
