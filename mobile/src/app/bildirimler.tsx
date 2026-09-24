import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getNotifications, markAllNotificationsRead, deleteAllNotifications, type NotificationItem } from "@/api/notifications";

/** Bildirimler - the mobile equivalent of the web bell dropdown. Tapping a
 * row navigates to the sender's profile (the notification text names them,
 * e.g. "X seni takip etmeye başladı") - the same "who did this" jump the
 * web bell offers, without trying to deep-link into every possible
 * notification target (comment/like/etc.) this pass. */
export default function BildirimlerScreen() {
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getNotifications();
    if (ignore?.current) return;
    setItems(result.notifications);
    if (result.unreadCount > 0) markAllNotificationsRead().catch(() => {});
  }, []);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onClearAll() {
    await deleteAllNotifications();
    setItems([]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/profil/[username]", params: { username: item.senderUsername } })}
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: item.view ? "transparent" : `${colors.accent}14`,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
          >
            <ThemedText variant="body">{item.contentTr}</ThemedText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
            <ThemedText variant="body" muted>Henüz bildirimin yok.</ThemedText>
          </View>
        }
        ListFooterComponent={
          items.length > 0 ? (
            <Button title="Tümünü Sil" variant="ghost" onPress={onClearAll} style={{ marginTop: spacing.md }} block />
          ) : null
        }
      />
    </View>
  );
}
