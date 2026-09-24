import { useCallback, useEffect, useState } from "react";
import { View, FlatList, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { BellIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { FeedCard } from "@/components/FeedCard";
import { getFeed, type FeedItem } from "@/api/feed";
import { getNotifications } from "@/api/notifications";

export default function AkisScreen() {
  const { colors, spacing } = useTheme();
  const { profile } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadFirstPage = useCallback(async (ignore?: { current: boolean }) => {
    try {
      const page = await getFeed();
      if (ignore?.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch {
      if (!ignore?.current) setError("Akış yüklenemedi. İnternet bağlantını kontrol et.");
    }
  }, []);

  // Refetches the unread badge every time Akış regains focus (e.g. coming
  // back from Bildirimler, which marks everything read) - deliberately not
  // the same mount-only effect as the feed itself.
  useFocusEffect(
    useCallback(() => {
      getNotifications()
        .then((r) => setUnreadCount(r.unreadCount))
        .catch(() => {});
    }, []),
  );

  // Same mount-time-fetch cleanup-guard shape as AuthContext's own effect.
  useEffect(() => {
    const ignore = { current: false };
    // Same react-hooks/set-state-in-effect false-positive as AuthContext's
    // own mount effect - see that comment for why this is deliberately
    // suppressed, not missed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [loadFirstPage]);

  async function onRefresh() {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!nextCursor) return;
    const page = await getFeed(nextCursor);
    setItems((prev) => [...prev, ...page.items]);
    setNextCursor(page.nextCursor);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <ThemedText variant="display">Akış</ThemedText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable onPress={() => router.push("/bildirimler")} style={{ padding: 4 }} hitSlop={8}>
            <BellIcon color={colors.text} size={24} />
            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}
              >
                <ThemedText variant="caption" color="#fff" style={{ fontSize: 10, lineHeight: 12 }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </ThemedText>
              </View>
            )}
          </Pressable>
          {profile && <Avatar id={profile.id} name={profile.name ?? profile.username} imageUrl={profile.image} size={36} />}
        </View>
      </View>

      {error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"] }}>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>
            {error}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => <FeedCard item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
                <ThemedText variant="body" muted>
                  Henüz akışta bir şey yok.
                </ThemedText>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
