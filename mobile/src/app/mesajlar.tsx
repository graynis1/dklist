import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView, Alert } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { MessageCirclePlusIcon, MessagesSquareIcon, XIcon, ChevronLeftIcon, MoreHorizontalIcon, Trash2Icon, CheckIcon } from "lucide-react-native";
import { showActionSheet } from "@/components/ActionSheet";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { relativeTime } from "@/lib/relativeTime";
import { getConversations, deleteChats, deleteAllChats, type ConversationItem } from "@/api/messages";
import { search, type SearchResultUser } from "@/api/search";

type Filter = "all" | "unread" | "requests";
type Row = ConversationItem & { isRequest: boolean };

export default function MesajlarScreen() {
  const { colors, spacing, radius } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [requests, setRequests] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [people, setPeople] = useState<SearchResultUser[]>([]);
  // Multi-select delete (customer: "toplu işaretleyip sil webdeki gibi").
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const canGoBack = router.canGoBack();

  function toggleSelected(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  function confirmDelete(ids: number[]) {
    if (ids.length === 0) return;
    Alert.alert(ids.length === 1 ? "Sohbet silinsin mi?" : `${ids.length} sohbet silinsin mi?`, "Mesaj geçmişi sadece senin tarafında silinir.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          const gone = new Set(ids);
          setConversations((c) => c.filter((x) => !gone.has(x.otherUserId)));
          setRequests((c) => c.filter((x) => !gone.has(x.otherUserId)));
          exitSelecting();
          try {
            await deleteChats(ids);
          } catch {
            void load();
          }
        },
      },
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert("Tüm sohbetler silinsin mi?", "Bütün mesaj geçmişin senin tarafında temizlenecek.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Tümünü Sil",
        style: "destructive",
        onPress: async () => {
          setConversations([]);
          setRequests([]);
          try {
            await deleteAllChats();
          } catch {
            void load();
          }
        },
      },
    ]);
  }
  const searchSeq = useRef(0);

  const load = useCallback(async () => {
    try {
      const result = await getConversations();
      setConversations(result.conversations);
      setRequests(result.requests);
      setError(null);
    } catch {
      setError("Mesajlar yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Returning from a thread should clear its unread badge immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onQueryChange(q: string) {
    setQuery(q);
    const seq = ++searchSeq.current;
    if (q.trim().length < 2) {
      setPeople([]);
      return;
    }
    try {
      const result = await search(q);
      if (seq === searchSeq.current) setPeople(result.users.slice(0, 8));
    } catch {
      // Person lookup is best-effort; local conversation filtering still works.
    }
  }

  const unreadTotal = conversations.reduce((n, c) => n + (c.unreadCount > 0 ? 1 : 0), 0);

  const rows = useMemo<Row[]>(() => {
    let all: Row[] = [...requests.map((r) => ({ ...r, isRequest: true })), ...conversations.map((c) => ({ ...c, isRequest: false }))];
    if (filter === "unread") all = all.filter((r) => r.unreadCount > 0);
    if (filter === "requests") all = all.filter((r) => r.isRequest);
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (q) all = all.filter((r) => r.otherUsername.toLocaleLowerCase("tr-TR").includes(q) || (r.lastMessagePreview ?? "").toLocaleLowerCase("tr-TR").includes(q));
    return all;
  }, [conversations, requests, filter, query]);

  const knownUsernames = new Set([...conversations, ...requests].map((c) => c.otherUsername));
  const newPeople = people.filter((p) => !knownUsernames.has(p.username));

  const openThread = (username: string) => {
    setComposeOpen(false);
    setQuery("");
    setPeople([]);
    router.push({ pathname: "/mesajlar/[username]", params: { username } });
  };

  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "Tümü" },
    { key: "unread", label: "Okunmamış", count: unreadTotal },
    { key: "requests", label: "İstekler", count: requests.length },
  ];

  const peopleSection =
    newPeople.length > 0 ? (
      <View style={{ paddingTop: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted} style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xs }}>
          {composeOpen ? "Kişiler" : "Yeni sohbet başlat"}
        </ThemedText>
        {newPeople.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => openThread(p.username)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
          >
            <Avatar id={p.id} name={p.username} imageUrl={p.image} size={44} />
            <ThemedText variant="bodySemibold" style={{ flex: 1 }}>@{p.username}</ThemedText>
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
              <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>Mesaj</ThemedText>
            </View>
          </Pressable>
        ))}
        {rows.length > 0 && <View style={{ height: 8, backgroundColor: colors.neutral200, marginTop: spacing.sm }} />}
      </View>
    ) : null;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      {selecting ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
          <Pressable onPress={exitSelecting} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
            <XIcon size={20} color={colors.text} />
          </Pressable>
          <ThemedText variant="title" style={{ flex: 1, fontSize: 19 }}>{selected.size} sohbet seçildi</ThemedText>
          <Pressable
            onPress={() => confirmDelete([...selected])}
            disabled={selected.size === 0}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: selected.size === 0 ? colors.neutral200 : pressed ? "#a93226" : "#c0392b" })}
          >
            <Trash2Icon size={16} color={selected.size === 0 ? colors.textMuted : "#fff"} />
            <ThemedText variant="bodySemibold" color={selected.size === 0 ? colors.textMuted : "#fff"}>Sil</ThemedText>
          </Pressable>
        </View>
      ) : (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        {canGoBack && (
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginLeft: -6 }}>
            <ChevronLeftIcon size={28} color={colors.text} />
          </Pressable>
        )}
        <ThemedText variant="display" style={{ flex: 1 }}>Mesajlar</ThemedText>
        {rows.length > 0 && !composeOpen && (
          <Pressable
            onPress={() =>
              showActionSheet({
                options: [
                  { text: "Sohbet seç", onPress: () => setSelecting(true) },
                  { text: "Tüm sohbetleri sil", destructive: true, onPress: confirmDeleteAll },
                ],
              })
            }
            hitSlop={6}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}
          >
            <MoreHorizontalIcon size={20} color={colors.text} />
          </Pressable>
        )}
        <Pressable
          onPress={() => setComposeOpen((v) => !v)}
          hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: composeOpen ? colors.accent : colors.neutral200, alignItems: "center", justifyContent: "center" }}
        >
          {composeOpen ? <XIcon size={20} color="#fff" /> : <MessageCirclePlusIcon size={20} color={colors.text} />}
        </Pressable>
      </View>
      )}

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar
          value={query}
          onChangeText={onQueryChange}
          placeholder={composeOpen ? "Kime yazmak istersin? (kullanıcı adı)" : "Sohbetlerde veya kişilerde ara"}
          autoFocus={composeOpen}
          key={composeOpen ? "compose" : "search"}
        />
      </View>

      {!composeOpen && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.xs, paddingBottom: spacing.sm, alignItems: "center" }}>
          {chips.map((c) => {
            const on = filter === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setFilter(c.key)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent100 : colors.neutral200 }}
              >
                <ThemedText variant="bodySemibold" color={on ? colors.accent700 : colors.text} style={{ fontSize: 13.5 }}>{c.label}</ThemedText>
                {c.count != null && c.count > 0 && (
                  <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                    <ThemedText variant="caption" color="#fff" style={{ fontSize: 10.5 }}>{c.count}</ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <EmptyState icon={<MessagesSquareIcon size={32} color={colors.accent} />} title="Bir sorun oluştu" subtitle={error} actionLabel="Tekrar Dene" onAction={onRefresh} />
      ) : composeOpen ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          {query.trim().length < 2 ? (
            <ThemedText variant="body" muted style={{ padding: spacing.lg }}>
              Mesaj göndermek istediğin kişinin kullanıcı adını yaz.
            </ThemedText>
          ) : people.length === 0 ? (
            <ThemedText variant="body" muted style={{ padding: spacing.lg }}>Kullanıcı bulunamadı.</ThemedText>
          ) : (
            people.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openThread(p.username)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
              >
                <Avatar id={p.id} name={p.username} imageUrl={p.image} size={44} />
                <ThemedText variant="bodySemibold">@{p.username}</ThemedText>
              </Pressable>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.isRequest ? "r" : "c"}-${item.otherUserId}`}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListHeaderComponent={peopleSection}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 56 + spacing.md }} />}
          contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
          renderItem={({ item }) => {
            const unread = item.unreadCount > 0;
            const isSel = selected.has(item.otherUserId);
            return (
              <Swipeable
                enabled={!selecting}
                friction={2}
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable onPress={() => confirmDelete([item.otherUserId])} style={{ width: 88, backgroundColor: "#c0392b", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <Trash2Icon size={20} color="#fff" />
                    <ThemedText variant="caption" color="#fff" style={{ fontWeight: "600" }}>Sil</ThemedText>
                  </Pressable>
                )}
              >
              <Pressable
                onPress={() => (selecting ? toggleSelected(item.otherUserId) : openThread(item.otherUsername))}
                onLongPress={() => {
                  setSelecting(true);
                  setSelected(new Set([item.otherUserId]));
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 10,
                  backgroundColor: isSel ? colors.accent100 : pressed ? colors.neutral200 : colors.card,
                })}
              >
                {selecting && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSel ? colors.accent : colors.neutral400, backgroundColor: isSel ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                    {isSel && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
                  </View>
                )}
                <View>
                  <Avatar id={item.otherUserId} name={item.otherUsername} imageUrl={item.otherImage} size={56} />
                  {unread && (
                    <View style={{ position: "absolute", right: 0, bottom: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 2.5, borderColor: colors.card }} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <ThemedText variant={unread ? "bodySemibold" : "body"} numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>
                      {item.otherUsername}
                    </ThemedText>
                    {item.isRequest && (
                      <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
                        <ThemedText variant="caption" color={colors.accent700} style={{ fontSize: 10.5, fontWeight: "600" }}>İSTEK</ThemedText>
                      </View>
                    )}
                    {item.lastMessageAt && (
                      <ThemedText variant="caption" color={unread ? colors.accent : colors.textMuted} style={{ fontWeight: unread ? "600" : "400" }}>
                        {relativeTime(item.lastMessageAt)}
                      </ThemedText>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <ThemedText
                      variant={unread ? "bodySemibold" : "caption"}
                      color={unread ? colors.text : colors.textMuted}
                      numberOfLines={1}
                      style={{ flex: 1, fontSize: 13.5 }}
                    >
                      {item.lastMessagePreview || "Sohbeti başlat"}
                    </ThemedText>
                    {unread && (
                      <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                        <ThemedText variant="caption" color="#fff" style={{ fontSize: 11, fontWeight: "700" }}>
                          {item.unreadCount > 99 ? "99+" : item.unreadCount}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            newPeople.length > 0 ? null : query ? (
              <EmptyState icon={<MessagesSquareIcon size={32} color={colors.accent} />} title="Sonuç yok" subtitle={`“${query}” ile eşleşen sohbet bulunamadı.`} />
            ) : filter !== "all" ? (
              <EmptyState icon={<MessagesSquareIcon size={32} color={colors.accent} />} title={filter === "unread" ? "Hepsini okudun" : "Bekleyen istek yok"} subtitle="Burada şu an gösterilecek bir şey yok." />
            ) : (
              <EmptyState
                icon={<MessagesSquareIcon size={32} color={colors.accent} />}
                title="Henüz mesajın yok"
                subtitle="Bir okurla kitap sohbetine başla — kitap ya da ilan paylaşabilirsin."
                actionLabel="Yeni Mesaj"
                onAction={() => setComposeOpen(true)}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
