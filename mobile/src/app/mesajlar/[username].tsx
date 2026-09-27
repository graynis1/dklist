import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { View, FlatList, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { BookIcon, TagIcon, XIcon, PlusIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { ComposerBar, ComposerIconButton } from "@/components/ComposerBar";
import { getThread, sendMessage, type MessageItem } from "@/api/messages";
import { search, type SearchResultBook } from "@/api/search";
import { getStoreList, type StoreListItem } from "@/api/store";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/api/config";
import { Avatar } from "@/components/Avatar";

const POLL_MS = 5000;
const GROUP_GAP_MS = 5 * 60 * 1000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diffDays === 0) return "Bugün";
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return d.toLocaleDateString("tr-TR", { weekday: "long" });
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: today.getFullYear() === d.getFullYear() ? undefined : "numeric" });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function StoreThumb({ uri, size }: { uri: string | null; size: number }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
        <TagIcon size={size * 0.42} color={colors.accent} />
      </View>
    );
  }
  return <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: 6, backgroundColor: colors.surface }} />;
}

function AttachmentCard({ item, mine }: { item: MessageItem; mine: boolean }) {
  const { colors, spacing } = useTheme();
  const a = item.attachment;
  if (!a) return null;
  const isBook = item.type === "book";

  return (
    <Pressable
      onPress={() =>
        isBook
          ? router.push({ pathname: "/kitap/[slug]", params: { slug: a.slug } })
          : router.push({ pathname: "/askida-kitap/[slug]", params: { slug: a.slug } })
      }
      style={({ pressed }) => ({
        width: 250,
        flexDirection: "row",
        gap: spacing.sm,
        alignItems: "center",
        padding: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: mine ? `${colors.accent}55` : colors.divider,
        backgroundColor: pressed ? colors.neutral100 : colors.card,
      })}
    >
      {isBook ? (
        <BookCover id={a.id} title={a.title} width={44} height={64} imageUrl={a.image ? `${API_BASE_URL}${a.image}` : null} />
      ) : (
        <StoreThumb uri={a.image ? `${API_BASE_URL}${a.image}` : null} size={56} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText variant="label" color={colors.accent} style={{ fontSize: 10 }}>{isBook ? "Kitap" : "İlan"}</ThemedText>
        <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 14.5 }}>{a.title}</ThemedText>
        {a.price != null && (
          <ThemedText variant="bodySemibold" color={colors.accent700} style={{ fontSize: 13 }}>{a.price.toLocaleString("tr-TR")} ₺</ThemedText>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}>
          <ThemedText variant="caption" muted style={{ fontSize: 11 }}>{isBook ? "Kitabı görüntüle" : "İlanı görüntüle"}</ThemedText>
          <ChevronRightIcon size={12} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

type Row =
  | { kind: "day"; key: string; label: string }
  | { kind: "msg"; key: string; item: MessageItem; mine: boolean; firstInGroup: boolean; lastInGroup: boolean };

export default function ThreadScreen() {
  const { colors, spacing, radius } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [other, setOther] = useState<{ id: number; image: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [olderCursor, setOlderCursor] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [trayOpen, setTrayOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<"book" | "store" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);
  const [storeResults, setStoreResults] = useState<StoreListItem[]>([]);
  const [pickedBook, setPickedBook] = useState<SearchResultBook | null>(null);
  const [pickedStore, setPickedStore] = useState<StoreListItem | null>(null);
  const pickerSeq = useRef(0);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username } })} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Avatar id={other?.id ?? 0} name={username} imageUrl={other?.image ?? null} size={36} />
          <View>
            <ThemedText variant="bodySemibold" style={{ fontSize: 15.5 }}>{username}</ThemedText>
            <ThemedText variant="caption" muted style={{ fontSize: 11 }}>Profili görüntüle</ThemedText>
          </View>
        </Pressable>
      ),
    });
  }, [navigation, username, other, spacing.sm]);

  const mergeLatest = useCallback((latest: MessageItem[]) => {
    setMessages((prev) => {
      if (prev.length === 0) return latest;
      const known = new Set(prev.map((m) => m.id));
      const fresh = latest.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, []);

  useEffect(() => {
    let ignore = false;
    getThread(username)
      .then((result) => {
        if (ignore) return;
        setMessages(result.messages);
        setOther({ id: result.otherUserId, image: result.otherImage });
        setOlderCursor(result.hasMore ? result.nextCursor : null);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    const interval = setInterval(() => {
      getThread(username)
        .then((r) => !ignore && mergeLatest(r.messages))
        .catch(() => {});
    }, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [username, mergeLatest]);

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const result = await getThread(username, olderCursor);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...result.messages.filter((m) => !known.has(m.id)), ...prev];
      });
      setOlderCursor(result.hasMore ? result.nextCursor : null);
    } finally {
      setLoadingOlder(false);
    }
  }

  // Inverted list: newest row first. Day separators sit above (i.e. after, in
  // inverted order) the first message of each day.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const t = m.createdAt ? new Date(m.createdAt).getTime() : 0;
      const newDay = !prev || !prev.createdAt || !m.createdAt || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
      if (newDay && m.createdAt) out.push({ kind: "day", key: `d-${m.id}`, label: dayLabel(m.createdAt) });
      const sameAsPrev = !newDay && prev && prev.senderId === m.senderId && prev.createdAt && t - new Date(prev.createdAt).getTime() < GROUP_GAP_MS;
      const nextNewDay = !next || !next.createdAt || !m.createdAt || new Date(next.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
      const sameAsNext = !nextNewDay && next && next.senderId === m.senderId && next.createdAt && new Date(next.createdAt).getTime() - t < GROUP_GAP_MS;
      out.push({ kind: "msg", key: `m-${m.id}`, item: m, mine: m.senderId === profile?.id, firstInGroup: !sameAsPrev, lastInGroup: !sameAsNext });
    }
    return out.reverse();
  }, [messages, profile?.id]);

  async function onPickerQueryChange(q: string) {
    setPickerQuery(q);
    const seq = ++pickerSeq.current;
    if (q.trim().length < 2) {
      setBookResults([]);
      setStoreResults([]);
      return;
    }
    setPickerLoading(true);
    try {
      if (pickerOpen === "book") {
        const result = await search(q);
        if (seq === pickerSeq.current) setBookResults(result.books.slice(0, 8));
      } else if (pickerOpen === "store") {
        const result = await getStoreList(null, q);
        if (seq === pickerSeq.current) setStoreResults(result.items.slice(0, 8));
      }
    } finally {
      if (seq === pickerSeq.current) setPickerLoading(false);
    }
  }

  function openPicker(kind: "book" | "store") {
    setPickerQuery("");
    setBookResults([]);
    setStoreResults([]);
    setTrayOpen(false);
    setPickerOpen(kind);
  }

  function closePicker() {
    setPickerOpen(null);
    setPickerQuery("");
  }

  function selectBook(book: SearchResultBook) {
    setPickedStore(null);
    setPickedBook(book);
    closePicker();
  }

  function selectStore(item: StoreListItem) {
    setPickedBook(null);
    setPickedStore(item);
    closePicker();
  }

  const hasAttachment = Boolean(pickedBook || pickedStore);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed && !hasAttachment) return;
    // The server requires message text even alongside an attachment.
    const body = trimmed || (pickedBook ? "Bu kitaba göz atar mısın? 📚" : "Bu ilana göz atar mısın? 🏷️");
    const attachment = pickedBook ? { type: "book" as const, id: pickedBook.id } : pickedStore ? { type: "store" as const, id: pickedStore.id } : undefined;
    setSending(true);
    try {
      const sent = await sendMessage(username, body, attachment);
      setText("");
      setPickedBook(null);
      setPickedStore(null);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.card }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const bubbleRadius = 18;
  const tight = 4;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.card }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <FlatList
        data={rows}
        inverted
        keyExtractor={(r) => r.key}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}
        ListFooterComponent={
          <View style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.xs }}>
            {loadingOlder ? (
              <ActivityIndicator color={colors.accent} />
            ) : !olderCursor ? (
              <>
                <Avatar id={other?.id ?? 0} name={username} imageUrl={other?.image ?? null} size={72} />
                <ThemedText variant="headline">{username}</ThemedText>
                <ThemedText variant="caption" muted>DKList okuru · kitap sohbetinin başlangıcı</ThemedText>
                <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username } })} style={{ marginTop: spacing.xs, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.neutral200 }}>
                  <ThemedText variant="bodySemibold" style={{ fontSize: 13 }}>Profili Gör</ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        }
        renderItem={({ item: row }) => {
          if (row.kind === "day") {
            return (
              <View style={{ alignItems: "center", marginVertical: spacing.md }}>
                <ThemedText variant="caption" muted style={{ fontSize: 11.5, fontWeight: "600" }}>{row.label}</ThemedText>
              </View>
            );
          }
          const { item, mine, firstInGroup, lastInGroup } = row;
          const corners = mine
            ? { borderTopLeftRadius: bubbleRadius, borderBottomLeftRadius: bubbleRadius, borderTopRightRadius: firstInGroup ? bubbleRadius : tight, borderBottomRightRadius: lastInGroup ? bubbleRadius : tight }
            : { borderTopRightRadius: bubbleRadius, borderBottomRightRadius: bubbleRadius, borderTopLeftRadius: firstInGroup ? bubbleRadius : tight, borderBottomLeftRadius: lastInGroup ? bubbleRadius : tight };
          return (
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: mine ? "flex-end" : "flex-start", gap: 6, marginTop: firstInGroup ? spacing.sm : 2 }}>
              {!mine && (
                <View style={{ width: 28 }}>
                  {lastInGroup && <Avatar id={other?.id ?? 0} name={username} imageUrl={other?.image ?? null} size={28} />}
                </View>
              )}
              <View style={{ maxWidth: "76%", alignItems: mine ? "flex-end" : "flex-start", gap: 3 }}>
                {item.attachment && <AttachmentCard item={item} mine={mine} />}
                {item.text ? (
                  <View style={{ paddingVertical: 8, paddingHorizontal: 13, backgroundColor: mine ? colors.accent : colors.neutral200, ...corners }}>
                    <ThemedText variant="body" color={mine ? "#fff" : colors.text} style={{ lineHeight: 20 }}>
                      {item.text}
                    </ThemedText>
                  </View>
                ) : null}
                {lastInGroup && item.createdAt && (
                  <ThemedText variant="caption" muted style={{ fontSize: 10.5, marginHorizontal: 4 }}>
                    {clock(item.createdAt)}
                  </ThemedText>
                )}
              </View>
            </View>
          );
        }}
      />

      {pickerOpen && (
        <View style={{ maxHeight: 340, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.card, paddingTop: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
            <ThemedText variant="title" style={{ flex: 1 }}>{pickerOpen === "book" ? "Kitap paylaş" : "İlan paylaş"}</ThemedText>
            <Pressable onPress={closePicker} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
              <XIcon size={16} color={colors.text} />
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: spacing.md }}>
            <SearchBar value={pickerQuery} onChangeText={onPickerQueryChange} placeholder={pickerOpen === "book" ? "Kitap adı veya yazar…" : "İlan ara…"} autoFocus />
          </View>
          <FlatList
            data={(pickerOpen === "book" ? bookResults : storeResults) as (SearchResultBook | StoreListItem)[]}
            keyExtractor={(i) => String(i.id)}
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: spacing.xs }}
            ListEmptyComponent={
              <View style={{ padding: spacing.lg, alignItems: "center" }}>
                {pickerLoading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <ThemedText variant="caption" muted>{pickerQuery.trim().length < 2 ? "Aramak için en az 2 harf yaz." : "Sonuç bulunamadı."}</ThemedText>
                )}
              </View>
            }
            renderItem={({ item }) =>
              pickerOpen === "book" ? (
                <Pressable onPress={() => selectBook(item as SearchResultBook)} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                  <BookCover id={item.id} title={(item as SearchResultBook).name} width={34} height={50} hasImage={(item as SearchResultBook).hasImage} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySemibold" numberOfLines={1}>{(item as SearchResultBook).name}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1}>{(item as SearchResultBook).writers.join(", ")}</ThemedText>
                  </View>
                  <PlusIcon size={18} color={colors.accent} />
                </Pressable>
              ) : (
                <Pressable onPress={() => selectStore(item as StoreListItem)} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                  <StoreThumb uri={mediaUrl((item as StoreListItem).image)} size={44} />
                  <ThemedText variant="bodySemibold" numberOfLines={2} style={{ flex: 1 }}>{(item as StoreListItem).title}</ThemedText>
                  <PlusIcon size={18} color={colors.accent} />
                </Pressable>
              )
            }
          />
        </View>
      )}

      {hasAttachment && !pickerOpen && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.neutral100 }}>
          {pickedBook ? <BookCover id={pickedBook.id} title={pickedBook.name} width={30} height={44} hasImage={pickedBook.hasImage} /> : <StoreThumb uri={mediaUrl(pickedStore?.image)} size={40} />}
          <View style={{ flex: 1 }}>
            <ThemedText variant="caption" color={colors.accent} style={{ fontWeight: "600" }}>{pickedBook ? "Kitap ekleniyor" : "İlan ekleniyor"}</ThemedText>
            <ThemedText variant="bodySemibold" numberOfLines={1}>{pickedBook?.name ?? pickedStore?.title}</ThemedText>
          </View>
          <Pressable onPress={() => { setPickedBook(null); setPickedStore(null); }} hitSlop={8} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral300, alignItems: "center", justifyContent: "center" }}>
            <XIcon size={14} color={colors.text} />
          </Pressable>
        </View>
      )}

      {trayOpen && !pickerOpen && (
        <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.card }}>
          {[
            { kind: "book" as const, label: "Kitap Gönder", sub: "Katalogdan seç", Icon: BookIcon },
            { kind: "store" as const, label: "İlan Gönder", sub: "Askıda Kitap ilanı", Icon: TagIcon },
          ].map(({ kind, label, sub, Icon }) => (
            <Pressable
              key={kind}
              onPress={() => openPicker(kind)}
              style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>{label}</ThemedText>
                <ThemedText variant="caption" muted style={{ fontSize: 11 }}>{sub}</ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <View>
        <ComposerBar
          value={text}
          onChangeText={setText}
          onSend={submit}
          sending={sending}
          canSend={text.trim().length > 0 || hasAttachment}
          placeholder={hasAttachment ? "Bir not ekle (isteğe bağlı)…" : "Mesaj yaz…"}
          onFocus={() => setTrayOpen(false)}
          leading={
            <ComposerIconButton
              active={trayOpen || Boolean(pickerOpen)}
              onPress={() => (pickerOpen ? closePicker() : setTrayOpen((v) => !v))}
              icon={trayOpen || pickerOpen ? <XIcon size={22} color={colors.accent} /> : <PlusIcon size={24} color={colors.accent} />}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
