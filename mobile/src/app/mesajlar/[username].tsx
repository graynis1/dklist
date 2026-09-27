import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { BookIcon, TagIcon, XIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { getThread, sendMessage, type MessageItem } from "@/api/messages";
import { search, type SearchResultBook } from "@/api/search";
import { getStoreList, type StoreListItem } from "@/api/store";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/api/config";
import { Avatar } from "@/components/Avatar";
import { relativeTime } from "@/lib/relativeTime";

const POLL_MS = 5000;

function AttachmentCard({ item }: { item: MessageItem }) {
  const { colors, spacing, radius } = useTheme();
  if (!item.attachment) return null;

  if (item.type === "book") {
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.attachment!.slug } })}
        style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}
      >
        <BookCover id={item.attachment.id} title={item.attachment.title} width={40} height={58} imageUrl={`${API_BASE_URL}${item.attachment.image}`} />
        <ThemedText variant="body" numberOfLines={2} style={{ flex: 1 }}>{item.attachment.title}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.attachment!.slug } })}
      style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}
    >
      {item.attachment.image && (
        <Image source={{ uri: `${API_BASE_URL}${item.attachment.image}` }} style={{ width: 40, height: 40, borderRadius: 6 }} />
      )}
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" numberOfLines={1}>{item.attachment.title}</ThemedText>
        {item.attachment.price != null && (
          <ThemedText variant="caption" color={colors.accent}>{item.attachment.price.toLocaleString("tr-TR")} ₺</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export default function ThreadScreen() {
  const { colors, spacing, radius } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherProfile, setOtherProfile] = useState<{ id: number; image: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [pickerOpen, setPickerOpen] = useState<"book" | "store" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);
  const [storeResults, setStoreResults] = useState<StoreListItem[]>([]);
  const [pickedBook, setPickedBook] = useState<SearchResultBook | null>(null);
  const [pickedStore, setPickedStore] = useState<StoreListItem | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          onPress={() => router.push({ pathname: "/profil/[username]", params: { username } })}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
        >
          <Avatar id={otherProfile?.id ?? 0} name={username} imageUrl={otherProfile?.image ?? null} size={30} />
          <ThemedText variant="bodySemibold">@{username}</ThemedText>
        </Pressable>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, username, otherProfile]);

  const load = useCallback(async () => {
    const result = await getThread(username);
    setMessages(result.messages);
    setOtherProfile({ id: result.otherUserId, image: result.otherImage });
  }, [username]);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => {
      if (!ignore) setLoading(false);
    });
    const interval = setInterval(() => {
      load().catch(() => {});
    }, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function onPickerQueryChange(q: string) {
    setPickerQuery(q);
    if (q.trim().length < 2) {
      setBookResults([]);
      setStoreResults([]);
      return;
    }
    if (pickerOpen === "book") {
      const result = await search(q);
      setBookResults(result.books.slice(0, 5));
    } else if (pickerOpen === "store") {
      const result = await getStoreList(null, q);
      setStoreResults(result.items.slice(0, 5));
    }
  }

  function openPicker(kind: "book" | "store") {
    setPickedBook(null);
    setPickedStore(null);
    setPickerQuery("");
    setBookResults([]);
    setStoreResults([]);
    setPickerOpen((current) => (current === kind ? null : kind));
  }

  function selectBook(book: SearchResultBook) {
    setPickedBook(book);
    setPickerOpen(null);
  }

  function selectStore(item: StoreListItem) {
    setPickedStore(item);
    setPickerOpen(null);
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const attachment = pickedBook ? { type: "book" as const, id: pickedBook.id } : pickedStore ? { type: "store" as const, id: pickedStore.id } : undefined;
    setPickedBook(null);
    setPickedStore(null);
    setSending(true);
    try {
      const sent = await sendMessage(username, trimmed, attachment);
      setMessages((prev) => [...prev, sent]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 4 }}>
              {item.attachment && <View style={{ maxWidth: "78%" }}><AttachmentCard item={item} /></View>}
              {item.text && (
                <View
                  style={{
                    maxWidth: "78%",
                    borderRadius: radius.lg,
                    paddingVertical: 9,
                    paddingHorizontal: 13,
                    backgroundColor: mine ? colors.accent : colors.surface,
                  }}
                >
                  <ThemedText variant="body" color={mine ? "#fff" : colors.text}>
                    {item.text}
                  </ThemedText>
                </View>
              )}
              {item.createdAt && (
                <ThemedText variant="caption" muted style={{ fontSize: 10 }}>
                  {relativeTime(item.createdAt)}
                </ThemedText>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
            <ThemedText variant="body" muted>
              Henüz mesaj yok - ilk mesajı sen gönder.
            </ThemedText>
          </View>
        }
      />

      {(pickedBook || pickedStore) && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.xs, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}>
          {pickedBook && <BookCover id={pickedBook.id} title={pickedBook.name} width={32} height={46} hasImage={pickedBook.hasImage} />}
          {pickedStore?.image && <Image source={{ uri: pickedStore.image }} style={{ width: 32, height: 32, borderRadius: 6 }} />}
          <ThemedText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {pickedBook?.name ?? pickedStore?.title}
          </ThemedText>
          <Pressable onPress={() => { setPickedBook(null); setPickedStore(null); }} hitSlop={8}>
            <XIcon size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {pickerOpen && (
        <View style={{ maxHeight: 260, marginHorizontal: spacing.md, marginBottom: spacing.xs, gap: spacing.xs }}>
          <TextField label="" value={pickerQuery} onChangeText={onPickerQueryChange} placeholder={pickerOpen === "book" ? "Kitap ara…" : "İlan ara…"} autoFocus />
          {pickerOpen === "book" ? (
            <FlatList
              data={bookResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable onPress={() => selectBook(item)} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: 6 }}>
                  <BookCover id={item.id} title={item.name} width={28} height={40} hasImage={item.hasImage} />
                  <ThemedText variant="body" numberOfLines={1}>{item.name}</ThemedText>
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={storeResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable onPress={() => selectStore(item)} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: 6 }}>
                  {item.image && <Image source={{ uri: item.image }} style={{ width: 28, height: 28, borderRadius: 6 }} />}
                  <ThemedText variant="body" numberOfLines={1}>{item.title}</ThemedText>
                </Pressable>
              )}
            />
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, alignItems: "flex-end" }}>
        <Pressable onPress={() => openPicker("book")} hitSlop={8} style={{ paddingBottom: 10 }}>
          <BookIcon size={20} color={pickerOpen === "book" ? colors.accent : colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => openPicker("store")} hitSlop={8} style={{ paddingBottom: 10 }}>
          <TagIcon size={20} color={pickerOpen === "store" ? colors.accent : colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TextField label="" value={text} onChangeText={setText} placeholder="Mesaj yaz…" multiline />
        </View>
        <Button title="Gönder" onPress={submit} disabled={sending || !text.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
