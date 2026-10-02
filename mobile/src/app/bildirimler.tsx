import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { View, SectionList, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { router, useNavigation, type Href } from "expo-router";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { BellIcon, UserPlusIcon, MessageCircleIcon, UsersIcon, TagIcon, AwardIcon, AtSignIcon, Trash2Icon, CheckCheckIcon, MoreHorizontalIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { showActionSheet } from "@/components/ActionSheet";
import { getNotifications, markAllNotificationsRead, markNotificationRead, deleteNotification, deleteAllNotifications, type NotificationItem } from "@/api/notifications";
import { routeForSiteLink } from "@/lib/siteLink";

const TYPE_ICON: Record<string, typeof BellIcon> = {
  follow: UserPlusIcon,
  message: MessageCircleIcon,
  club: UsersIcon,
  marketplace: TagIcon,
  badge: AwardIcon,
  mention: AtSignIcon,
};

/** Where a notification should open: its stored link, or - for older
 * notifications created before links existed - the obvious place for its type. */
function targetFor(n: NotificationItem): Href | null {
  const fromLink = routeForSiteLink(n.link);
  if (fromLink) return fromLink;
  switch (n.type) {
    case "follow":
    case "mention":
      return { pathname: "/profil/[username]", params: { username: n.senderUsername } };
    case "message":
      return { pathname: "/mesajlar/[username]", params: { username: n.senderUsername } };
    case "club":
      return "/kulupler";
    case "marketplace":
      return "/ilanlarim";
    case "badge":
      return "/rozetler";
    default:
      return null;
  }
}

export default function BildirimlerScreen() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await getNotifications()).notifications);
    } catch {
      // pull to retry
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, view: true })));
    await markAllNotificationsRead().catch(() => {});
  }

  function clearAll() {
    Alert.alert("Tüm bildirimler silinsin mi?", "Bu işlem geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Tümünü Sil",
        style: "destructive",
        onPress: async () => {
          setItems([]);
          await deleteAllNotifications().catch(() => {});
        },
      },
    ]);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        items.length > 0 ? (
          <Pressable
            hitSlop={10}
            onPress={() =>
              showActionSheet({
                options: [
                  { text: "Tümünü okundu say", onPress: () => void markAllRead() },
                  { text: "Tümünü sil", destructive: true, onPress: clearAll },
                ],
              })
            }
          >
            <MoreHorizontalIcon size={22} color={colors.accent} />
          </Pressable>
        ) : null,
    });
  }, [navigation, items.length, colors.accent]);

  async function remove(id: number) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id).catch(() => {});
  }

  function open(n: NotificationItem) {
    if (!n.view) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, view: true } : x)));
      markNotificationRead(n.id).catch(() => {});
    }
    const target = targetFor(n);
    if (target) router.push(target);
  }

  const sections = useMemo(() => {
    const unread = items.filter((n) => !n.view);
    const read = items.filter((n) => n.view);
    return [
      ...(unread.length ? [{ title: "Yeni", data: unread }] : []),
      ...(read.length ? [{ title: "Önceki", data: read }] : []),
    ];
  }, [items]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const unreadCount = items.filter((n) => !n.view).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      {unreadCount > 0 && (
        <Pressable onPress={markAllRead} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: pressed ? colors.accent200 : colors.accent100 })}>
          <CheckCheckIcon size={16} color={colors.accent800} />
          <ThemedText variant="bodySemibold" color={colors.accent800} style={{ fontSize: 13.5 }}>{unreadCount} okunmamış · Tümünü okundu say</ThemedText>
        </Pressable>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: spacing["3xl"], flexGrow: 1 }}
        renderSectionHeader={({ section }) => (
          <ThemedText variant="title" style={{ fontSize: 17, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs }}>{section.title}</ThemedText>
        )}
        ListEmptyComponent={<EmptyState icon={<BellIcon size={30} color={colors.accent} />} title="Bildirimin yok" subtitle="Takip, mesaj, kulüp ve ilan hareketleri burada görünür." />}
        ListFooterComponent={items.length > 0 ? <ThemedText variant="caption" muted style={{ textAlign: "center", paddingTop: spacing.lg }}>Silmek için bildirimi sola kaydır</ThemedText> : null}
        renderItem={({ item }) => {
          const Icon = TYPE_ICON[item.type] ?? BellIcon;
          return (
            <Swipeable
              friction={2}
              rightThreshold={60}
              overshootRight={false}
              renderRightActions={() => (
                <Pressable onPress={() => remove(item.id)} style={{ width: 88, backgroundColor: "#c0392b", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <Trash2Icon size={20} color="#fff" />
                  <ThemedText variant="caption" color="#fff" style={{ fontWeight: "600" }}>Sil</ThemedText>
                </Pressable>
              )}
            >
              <Pressable
                onPress={() => open(item)}
                onLongPress={() =>
                  showActionSheet({
                    options: [
                      ...(!item.view ? [{ text: "Okundu olarak işaretle", onPress: () => { setItems((p) => p.map((x) => (x.id === item.id ? { ...x, view: true } : x))); markNotificationRead(item.id).catch(() => {}); } }] : []),
                      { text: "Bildirimi sil", destructive: true, onPress: () => void remove(item.id) },
                    ],
                  })
                }
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.neutral200 : item.view ? colors.card : `${colors.accent}14` })}
              >
                <View>
                  <Avatar id={0} name={item.senderUsername} imageUrl={item.senderImage} size={50} />
                  <View style={{ position: "absolute", right: -3, bottom: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                    <Icon size={12} color="#fff" />
                  </View>
                </View>
                <ThemedText variant="body" style={{ flex: 1, lineHeight: 20, fontFamily: undefined }} numberOfLines={3}>
                  {item.contentTr}
                </ThemedText>
                {!item.view && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}
              </Pressable>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}
