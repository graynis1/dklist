import { useCallback, useEffect, useState } from "react";
import { View, FlatList, RefreshControl, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { BellIcon, ImageIcon, BookIcon, XIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { FeedCard } from "@/components/FeedCard";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { getFeed, createFeedPost, type FeedItem } from "@/api/feed";
import { getNotifications } from "@/api/notifications";
import { search, type SearchResultBook } from "@/api/search";

export default function AkisScreen() {
  const { colors, spacing } = useTheme();
  const { profile } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postImage, setPostImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);
  const [postBook, setPostBook] = useState<SearchResultBook | null>(null);

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

  async function pickPostImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPostImage({ uri: asset.uri, name: asset.fileName ?? `feed-${Date.now()}.jpg`, type: asset.mimeType ?? "image/jpeg" });
  }

  async function onBookQueryChange(q: string) {
    setBookQuery(q);
    if (q.trim().length < 2) {
      setBookResults([]);
      return;
    }
    const result = await search(q);
    setBookResults(result.books.slice(0, 5));
  }

  function selectBook(book: SearchResultBook) {
    setPostBook(book);
    setBookPickerOpen(false);
    setBookQuery("");
    setBookResults([]);
  }

  async function onPost() {
    const trimmed = postText.trim();
    if (!trimmed && !postImage && !postBook) return;
    setPosting(true);
    try {
      await createFeedPost({ text: trimmed, image: postImage, bookId: postBook?.id ?? null });
      setPostText("");
      setPostImage(null);
      setPostBook(null);
      await loadFirstPage();
    } finally {
      setPosting(false);
    }
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
          ListHeaderComponent={
            <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
              <TextField label="" value={postText} onChangeText={setPostText} placeholder="Ne düşünüyorsun?" multiline />

              {postImage && (
                <View style={{ alignSelf: "flex-start" }}>
                  <Image source={{ uri: postImage.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                  <Pressable
                    onPress={() => setPostImage(null)}
                    style={{ position: "absolute", top: -6, right: -6, backgroundColor: colors.bg, borderRadius: 999, borderWidth: 1, borderColor: colors.divider, padding: 3 }}
                  >
                    <XIcon size={12} color={colors.text} />
                  </Pressable>
                </View>
              )}

              {postBook && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", borderWidth: 1, borderColor: colors.divider, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }}>
                  <ThemedText variant="caption" numberOfLines={1}>{postBook.name}</ThemedText>
                  <Pressable onPress={() => setPostBook(null)}>
                    <XIcon size={12} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}

              {bookPickerOpen && (
                <View style={{ gap: spacing.xs }}>
                  <TextField label="" value={bookQuery} onChangeText={onBookQueryChange} placeholder="Kitap ara…" autoFocus />
                  {bookResults.map((b) => (
                    <Pressable key={b.id} onPress={() => selectBook(b)} style={{ paddingVertical: 6 }}>
                      <ThemedText variant="body" numberOfLines={1}>{b.name}</ThemedText>
                      <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <Pressable onPress={pickPostImage} hitSlop={8}>
                  <ImageIcon size={20} color={colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => setBookPickerOpen((o) => !o)} hitSlop={8}>
                  <BookIcon size={20} color={bookPickerOpen ? colors.accent : colors.textMuted} />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Button title="Paylaş" onPress={onPost} disabled={posting || (!postText.trim() && !postImage && !postBook)} />
              </View>
            </View>
          }
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
