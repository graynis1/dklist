import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showActionSheet } from "@/components/ActionSheet";
import { shareLink } from "@/lib/share";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  HeartIcon,
  ListPlusIcon,
  Share2Icon,
  BookOpenIcon,
  CheckCircle2Icon,
  BookmarkIcon,
  PauseCircleIcon,
  StarIcon,
  MessageSquareIcon,
  XIcon,
  QuoteIcon,
  LibraryIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
} from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { FloatingBack } from "@/components/ui";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { ComposerBar } from "@/components/ComposerBar";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { getBook, rateBook, toggleBookLike, addBookComment, addCommentReply, editComment, deleteMyComment, type BookDetailResponse, type BookComment, type CommentReply } from "@/api/book";
import { setLibraryStatus, toggleOwnedBook, type ReadStatus } from "@/api/library";
import { relativeTime } from "@/lib/relativeTime";
import { getMyLists, addBookToList, type UserListSummary } from "@/api/lists";
import { API_BASE_URL } from "@/api/config";
import { pickDropReason, dropReasonLabel, type DropReason } from "@/lib/dropReason";

const STATUS: { key: ReadStatus; label: string; Icon: typeof BookOpenIcon }[] = [
  { key: "currentRead", label: "Okuyorum", Icon: BookOpenIcon },
  { key: "finishRead", label: "Okudum", Icon: CheckCircle2Icon },
  { key: "targetRead", label: "Okuyacağım", Icon: BookmarkIcon },
  { key: "dropRead", label: "Yarıda Bıraktım", Icon: PauseCircleIcon },
];

const LANG_LABEL: Record<string, string> = { tur: "Türkçe", tr: "Türkçe", eng: "İngilizce", en: "İngilizce", ger: "Almanca", fre: "Fransızca", rus: "Rusça", spa: "İspanyolca", ita: "İtalyanca", ara: "Arapça" };

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors, spacing, radius } = useTheme();
  return <View style={[{ backgroundColor: colors.card, marginTop: spacing.md, marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: radius.lg }, style]}>{children}</View>;
}

const READER_STATUS: Record<string, string> = { currentRead: "Okuyor", finishRead: "Okudu", targetRead: "Okuyacak", dropRead: "Bıraktı" };

export default function BookDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [data, setData] = useState<BookDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [rateSaving, setRateSaving] = useState(false);
  const [likeSaving, setLikeSaving] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [myLists, setMyLists] = useState<UserListSummary[] | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [tab, setTab] = useState<"comments" | "quotes">("comments");

  const load = useCallback(async () => {
    try {
      setData(await getBook(slug));
      setError(null);
    } catch {
      setError("Kitap yüklenemedi.");
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  // The hero draws its own floating back/share buttons over the blurred cover.
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  function openStatusSheet() {
    if (!data) return;
    const current = data.myStatus?.status;
    showActionSheet({
      title: "Okuma durumu",
      options: [
        ...STATUS.map((st) => ({ text: (current === st.key ? "✓ " : "") + st.label, onPress: () => pickStatus(st.key) })),
        ...(current ? [{ text: "Rafımdan çıkar", destructive: true, onPress: () => void saveStatus(null) }] : []),
      ],
    });
  }

  function pickStatus(status: ReadStatus) {
    if (!data) return;
    const clearing = data.myStatus?.status === status;
    if (clearing) return;
    if (status === "dropRead" && !clearing) {
      pickDropReason((reason) => void saveStatus(status, reason));
      return;
    }
    void saveStatus(clearing ? null : status);
  }

  async function saveStatus(status: ReadStatus | null, dropReason?: DropReason) {
    if (!data) return;
    setStatusSaving(true);
    try {
      await setLibraryStatus(data.book.id, status, dropReason);
      await load();
    } catch {
      Alert.alert("Hata", "Okuma durumu güncellenemedi.");
    } finally {
      setStatusSaving(false);
    }
  }

  async function submitRating(value: number) {
    setRateSaving(true);
    try {
      await rateBook(slug, value);
      await load();
    } catch {
      Alert.alert("Hata", "Puan verilemedi.");
    } finally {
      setRateSaving(false);
    }
  }

  async function onOpenListPicker() {
    if (!myLists) {
      try {
        const result = await getMyLists();
        setMyLists(result.lists);
      } catch {
        Alert.alert("Hata", "Listelerin yüklenemedi.");
        return;
      }
    }
    setShowListPicker((v) => !v);
  }

  async function onAddToList(listSlug: string) {
    try {
      await addBookToList(listSlug, slug);
      setShowListPicker(false);
      Alert.alert("Eklendi", "Kitap listeye eklendi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Eklenemedi.");
    }
  }

  async function onToggleOwned() {
    if (!data) return;
    const was = Boolean(data.owned);
    setData({ ...data, owned: !was });
    try {
      const r = await toggleOwnedBook(data.book.id);
      setData((d) => (d ? { ...d, owned: r.inLibrary } : d));
    } catch {
      setData((d) => (d ? { ...d, owned: was } : d));
      Alert.alert("Hata", "Kütüphane güncellenemedi.");
    }
  }

  async function onToggleLike() {
    if (!data) return;
    setLikeSaving(true);
    try {
      const r = await toggleBookLike(slug);
      setData({ ...data, liked: r.liked, likeCount: data.likeCount + (r.liked ? 1 : -1) });
    } finally {
      setLikeSaving(false);
    }
  }

  function onShare() {
    if (!data) return;
    const url = `https://dklist.com/kitap/${slug}`;
    const by = data.book.writers.map((w) => w.name).join(", ");
    void shareLink(`${data.book.name}${by ? ` — ${by}` : ""}`, url);
  }

  async function submitComment() {
    const trimmed = commentText.trim();
    if (trimmed.length < 2) return;
    setCommentSaving(true);
    try {
      await addBookComment(slug, trimmed, tab === "quotes" ? "quotation" : "comment");
      setCommentText("");
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setCommentSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <FloatingBack />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <FloatingBack />
        <EmptyState icon={<BookOpenIcon size={30} color={colors.accent} />} title="Kitap bulunamadı" subtitle={error ?? undefined} actionLabel="Tekrar Dene" onAction={load} />
      </View>
    );
  }

  const { book, displayScore, pooledEditionCount, ratingCount, myRating, myStatus, likeCount, liked, comments } = data;
  const quotes = data.quotes ?? [];
  const shown = tab === "quotes" ? quotes : comments;
  const writerNames = book.writers.map((w) => w.name).join(", ");
  const coverUrl = book.hasImage ? `${API_BASE_URL}/kapak/${book.id}` : null;
  const description = book.content ?? book.aiSummary;
  const langLabel = LANG_LABEL[book.lang] ?? (book.lang && book.lang !== "und" ? book.lang.toUpperCase() : null);

  const details: { label: string; value: string; onPress?: () => void }[] = [];
  if (book.orgName && book.orgName !== book.name) details.push({ label: "Orijinal adı", value: book.orgName });
  book.translators.forEach((t) => details.push({ label: "Çevirmen", value: t.name, onPress: () => router.push({ pathname: "/cevirmen/[slug]", params: { slug: t.slug } }) }));
  if (book.publisher) {
    const p = book.publisher;
    details.push({ label: "Yayınevi", value: p.name, onPress: () => router.push({ pathname: "/yayinevi/[slug]", params: { slug: p.slug } }) });
  }
  if (book.pageNumber > 0) details.push({ label: "Sayfa sayısı", value: String(book.pageNumber) });
  if (langLabel) details.push({ label: "Dil", value: langLabel });
  if (pooledEditionCount && pooledEditionCount > 1) details.push({ label: "Baskı", value: `${pooledEditionCount} farklı baskı` });

  const statusInfo = STATUS.find((st) => st.key === myStatus?.status);
  const meta = [
    displayScore > 0 ? `★ ${displayScore.toFixed(1)}` : null,
    ratingCount > 0 ? `${ratingCount} oy` : null,
    book.pageNumber > 0 ? `${book.pageNumber} sayfa` : null,
    likeCount > 0 ? `${likeCount} beğeni` : null,
  ].filter(Boolean).join("  ·  ");
  const glass = { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.32)", alignItems: "center" as const, justifyContent: "center" as const };

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={{ overflow: "hidden" }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} blurRadius={30} style={{ position: "absolute", top: -30, left: -30, right: -30, bottom: -30 }} resizeMode="cover" />
          ) : null}
          <LinearGradient
            colors={coverUrl ? ["rgba(18,16,14,0.45)", "rgba(18,16,14,0.78)", "rgba(18,16,14,0.92)"] : [colors.accent700, colors.accent900]}
            style={{ paddingTop: insets.top + 6, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={8} style={glass} accessibilityLabel="Geri">
                <ChevronLeftIcon size={24} color="#fff" />
              </Pressable>
              <Pressable onPress={onShare} hitSlop={8} style={glass} accessibilityLabel="Paylaş">
                <Share2Icon size={19} color="#fff" />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <View style={{ borderRadius: 6, ...shadow.lg }}>
                <BookCover id={book.id} title={book.name} author={writerNames} width={138} height={206} hasImage={book.hasImage} />
              </View>
              <ThemedText variant="bookTitle" color="#fff" style={{ textAlign: "center", fontSize: 29, lineHeight: 33, marginTop: spacing.sm }}>
                {book.name}
              </ThemedText>
              {book.writers.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
                  {book.writers.map((w, i) => (
                    <ThemedText key={w.id} variant="bodySemibold" color={colors.accent300} onPress={() => router.push({ pathname: "/yazar/[slug]", params: { slug: w.slug } })}>
                      {w.name}
                      {i < book.writers.length - 1 ? ", " : ""}
                    </ThemedText>
                  ))}
                </View>
              )}
              {meta ? <ThemedText variant="caption" color="rgba(255,255,255,0.78)" style={{ fontSize: 13 }}>{meta}</ThemedText> : null}
            </View>

            {/* Primary actions */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg }}>
              <View style={{ flex: 1, flexDirection: "row", height: 48, borderRadius: 24, overflow: "hidden", backgroundColor: statusInfo ? "#fff" : colors.accent, opacity: statusSaving ? 0.6 : 1 }}>
                <Pressable
                  disabled={statusSaving}
                  onPress={() => (statusInfo ? openStatusSheet() : pickStatus("targetRead"))}
                  style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed ? "rgba(0,0,0,0.08)" : "transparent" })}
                >
                  {statusSaving ? (
                    <ActivityIndicator color={statusInfo ? colors.accent : "#fff"} />
                  ) : statusInfo ? (
                    <>
                      <statusInfo.Icon size={18} color={colors.accent700} />
                      <ThemedText variant="bodySemibold" color={colors.accent800}>{statusInfo.label}</ThemedText>
                    </>
                  ) : (
                    <>
                      <BookmarkIcon size={18} color="#fff" />
                      <ThemedText variant="bodySemibold" color="#fff">Okuyacağım</ThemedText>
                    </>
                  )}
                </Pressable>
                <View style={{ width: StyleSheet.hairlineWidth, marginVertical: 10, backgroundColor: statusInfo ? colors.divider : "rgba(255,255,255,0.45)" }} />
                <Pressable disabled={statusSaving} onPress={openStatusSheet} accessibilityLabel="Okuma durumunu seç" style={({ pressed }) => ({ width: 50, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(0,0,0,0.08)" : "transparent" })}>
                  <ChevronDownIcon size={20} color={statusInfo ? colors.accent800 : "#fff"} />
                </Pressable>
              </View>
              <Pressable onPress={onToggleLike} disabled={likeSaving} accessibilityLabel="Beğen" style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)" })}>
                <HeartIcon size={21} color={liked ? "#ff6b6b" : "#fff"} fill={liked ? "#ff6b6b" : "transparent"} />
              </Pressable>
              <Pressable onPress={onToggleOwned} accessibilityLabel={data.owned ? "Kütüphanemden çıkar" : "Kütüphaneme ekle"} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: data.owned ? "#fff" : pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)" })}>
                <LibraryIcon size={20} color={data.owned ? colors.accent700 : "#fff"} />
              </Pressable>
              <Pressable onPress={onOpenListPicker} accessibilityLabel="Listeye ekle" style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: pressed || showListPicker ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.16)" })}>
                <ListPlusIcon size={21} color="#fff" />
              </Pressable>
            </View>
            {myStatus?.status === "dropRead" && myStatus.dropReason ? (
              <ThemedText variant="caption" color="rgba(255,255,255,0.7)" style={{ textAlign: "center", marginTop: spacing.sm }}>
                Yarıda bıraktın · {dropReasonLabel(myStatus.dropReason)}
              </ThemedText>
            ) : null}
            {data.owned ? (
              <ThemedText variant="caption" color="rgba(255,255,255,0.75)" style={{ textAlign: "center", marginTop: spacing.sm }}>
                Kütüphanende var
              </ThemedText>
            ) : null}
          </LinearGradient>
        </View>

        {showListPicker && (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <ThemedText variant="title" style={{ flex: 1 }}>Listeye ekle</ThemedText>
              <Pressable onPress={() => setShowListPicker(false)} hitSlop={8} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
                <XIcon size={15} color={colors.text} />
              </Pressable>
            </View>
            {myLists && myLists.length === 0 ? (
              <View style={{ gap: spacing.sm }}>
                <ThemedText variant="body" muted>Henüz bir listen yok.</ThemedText>
                <Pressable onPress={() => router.push("/listelerim")} style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: colors.accent }}>
                  <ThemedText variant="bodySemibold" color="#fff">Liste Oluştur</ThemedText>
                </Pressable>
              </View>
            ) : (
              myLists?.map((l, i) => (
                <Pressable
                  key={l.id}
                  onPress={() => onAddToList(l.slug)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider, opacity: pressed ? 0.6 : 1 })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                    <ListPlusIcon size={17} color={colors.accent} />
                  </View>
                  <ThemedText variant="bodySemibold" style={{ flex: 1 }}>{l.title}</ThemedText>
                </Pressable>
              ))
            )}
          </Card>
        )}

        {/* Rating */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader title="Puanın" />
            <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: myRating ? colors.accent100 : colors.neutral200, marginBottom: spacing.sm }}>
              <ThemedText variant="bodySemibold" color={myRating ? colors.accent700 : colors.textMuted} style={{ fontSize: 13 }}>
                {myRating ? `${myRating} / 10` : "Henüz puanlamadın"}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", opacity: rateSaving ? 0.5 : 1 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const on = myRating != null && n <= myRating;
              return (
                <Pressable key={n} disabled={rateSaving} onPress={() => submitRating(n)} hitSlop={4} accessibilityLabel={`${n} puan`}>
                  <StarIcon size={27} color={on ? colors.accent : colors.neutral300} fill={on ? colors.accent : colors.neutral200} strokeWidth={1.5} />
                </Pressable>
              );
            })}
          </View>
          {!myRating && <ThemedText variant="caption" muted style={{ marginTop: spacing.sm }}>Puan vermek için bir yıldıza dokun</ThemedText>}
        </Card>

        {/* About */}
        {description ? (
          <Card>
            <SectionHeader title={book.content ? "Kitap hakkında" : "Yapay zekâ özeti"} />
            <ThemedText variant="body" style={{ lineHeight: 22 }} numberOfLines={descExpanded ? undefined : 5}>
              {description}
            </ThemedText>
            {description.length > 240 && (
              <ThemedText variant="bodySemibold" color={colors.accent} style={{ marginTop: spacing.xs }} onPress={() => setDescExpanded((v) => !v)}>
                {descExpanded ? "Daha az göster" : "Devamını oku"}
              </ThemedText>
            )}
          </Card>
        ) : null}

        {/* Details */}
        {details.length > 0 && (
          <Card>
            <SectionHeader title="Detaylar" />
            {details.map((d, i) => (
              <Pressable key={`${d.label}-${i}`} disabled={!d.onPress} onPress={d.onPress} style={{ flexDirection: "row", paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider }}>
                <ThemedText variant="body" muted style={{ width: 120 }}>{d.label}</ThemedText>
                <ThemedText variant="bodySemibold" color={d.onPress ? colors.accent700 : colors.text} style={{ flex: 1 }}>{d.value}</ThemedText>
              </Pressable>
            ))}
            {book.categories.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md, gap: spacing.sm }}>
                <ThemedText variant="body" muted>Kategoriler</ThemedText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {book.categories.map((c) => (
                    <Pressable key={c.id} onPress={() => router.push({ pathname: "/kategori/[slug]", params: { slug: c.slug } })} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.neutral200 }}>
                      <ThemedText variant="caption" style={{ fontWeight: "600" }}>{c.name}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Readers */}
        {data.readers && data.readers.length > 0 && (
          <Card style={{ paddingHorizontal: 0 }}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SectionHeader title="Bu kitabı okuyanlar" count={data.readerCount ?? data.readers.length} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
              {data.readers.map((r) => (
                <Pressable key={r.id} onPress={() => router.push({ pathname: "/profil/[username]", params: { username: r.username } })} style={({ pressed }) => ({ width: 64, alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1 })}>
                  <Avatar id={r.id} name={r.username} imageUrl={r.image} size={52} />
                  <ThemedText variant="caption" numberOfLines={1} style={{ fontSize: 11.5, fontWeight: "500" }}>{r.username}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 10.5, marginTop: -3 }}>{READER_STATUS[r.status] ?? ""}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Similar books */}
        {data.similar && data.similar.length > 0 && (
          <Card style={{ paddingHorizontal: 0 }}>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <SectionHeader title="Benzer kitaplar" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
              {data.similar.map((b) => (
                <Pressable key={b.id} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ width: 96, gap: 6, opacity: pressed ? 0.75 : 1 })}>
                  <View style={{ borderRadius: 4, ...shadow.md }}>
                    <BookCover id={b.id} title={b.name} author={b.writers.join(", ")} width={96} height={142} hasImage={b.hasImage} score={b.score} />
                  </View>
                  <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{b.name}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: -4 }}>{b.writers.join(", ")}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <View style={{ flexDirection: "row", backgroundColor: colors.neutral200, borderRadius: radius.pill, padding: 3, marginBottom: spacing.md }}>
            {([["comments", "Yorumlar", comments.length], ["quotes", "Alıntılar", quotes.length]] as const).map(([key, label, count]) => {
              const on = tab === key;
              return (
                <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: radius.pill, backgroundColor: on ? colors.card : "transparent", ...(on ? shadow.sm : {}) }}>
                  <ThemedText variant="bodySemibold" color={on ? colors.text : colors.textMuted} style={{ fontSize: 14 }}>
                    {label}{count > 0 ? ` · ${count}` : ""}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginBottom: spacing.md }}>
            {profile && <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={36} frameColor={profile.profileFrame} frameTier={profile.frameTier} />}
            <View style={{ flex: 1 }}>
              <ComposerBar
                bordered={false}
                value={commentText}
                onChangeText={setCommentText}
                onSend={submitComment}
                sending={commentSaving}
                canSend={commentText.trim().length >= 2}
                placeholder={tab === "quotes" ? "Kitaptan sevdiğin bir alıntıyı paylaş…" : "Bu kitap hakkında ne düşünüyorsun?"}
              />
            </View>
          </View>
          {shown.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs }}>
              {tab === "quotes" ? <QuoteIcon size={28} color={colors.neutral400} /> : <MessageSquareIcon size={28} color={colors.neutral400} />}
              <ThemedText variant="body" muted>{tab === "quotes" ? "İlk alıntıyı sen paylaş." : "İlk yorumu sen yaz."}</ThemedText>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              {shown.map((c) => (
                <CommentRow key={c.id} comment={c} onReplied={load} quote={tab === "quotes"} />
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardScreen>
  );
}

function Bubble({ username, userId, image, frameColor, frameTier, text, meta, avatarSize = 36, quote = false }: {
  username: string;
  userId: number;
  image: string | null;
  frameColor: string | null;
  frameTier: 1 | 2 | 3 | 4;
  text: string;
  meta?: React.ReactNode;
  avatarSize?: number;
  quote?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const goProfile = () => router.push({ pathname: "/profil/[username]", params: { username } });
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Pressable onPress={goProfile}>
        <Avatar id={userId} name={username} imageUrl={image} size={avatarSize} frameColor={frameColor} frameTier={frameTier} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "flex-start" }}>
        <View style={quote
          ? { backgroundColor: colors.accent100, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: colors.accent, paddingVertical: 10, paddingHorizontal: 12, alignSelf: "stretch" }
          : { backgroundColor: colors.neutral200, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, maxWidth: "100%" }}>
          <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }} onPress={goProfile}>{username}</ThemedText>
          <ThemedText variant="body" style={{ lineHeight: 20, marginTop: quote ? 4 : 1, fontStyle: quote ? "italic" : "normal" }}>{quote ? `“${text}”` : text}</ThemedText>
        </View>
        {meta}
      </View>
    </View>
  );
}

function CommentRow({ comment, onReplied, quote = false }: { comment: BookComment; onReplied: () => Promise<void>; quote?: boolean }) {
  const { colors, spacing } = useTheme();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReply() {
    const trimmed = replyText.trim();
    if (trimmed.length < 2) return;
    setSaving(true);
    try {
      await addCommentReply(comment.id, trimmed);
      setReplyText("");
      setShowReplyBox(false);
      await onReplied();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yanıt eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  const { profile } = useAuth();
  const [editing, setEditing] = useState<{ id: number; kind: "comment" | "reply"; text: string } | null>(null);

  function ownMenu(id: number, kind: "comment" | "reply", text: string) {
    showActionSheet({
      options: [
        { text: "Düzenle", onPress: () => setEditing({ id, kind, text }) },
        {
          text: "Sil",
          destructive: true,
          onPress: () =>
            Alert.alert(kind === "reply" ? "Yanıt silinsin mi?" : quote ? "Alıntı silinsin mi?" : "Yorum silinsin mi?", undefined, [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sil",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteMyComment(id, kind);
                    await onReplied();
                  } catch (err) {
                    Alert.alert("Hata", err instanceof Error ? err.message : "Silinemedi.");
                  }
                },
              },
            ]),
        },
      ],
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await editComment(editing.id, editing.text.trim(), editing.kind);
      setEditing(null);
      await onReplied();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  const editBox = (id: number, kind: "comment" | "reply") =>
    editing && editing.id === id && editing.kind === kind ? (
      <View style={{ marginTop: spacing.sm, marginLeft: kind === "comment" ? 44 : 0 }}>
        <ComposerBar bordered value={editing.text} onChangeText={(t) => setEditing({ ...editing, text: t })} onSend={saveEdit} sending={saving} canSend={editing.text.trim().length >= 2} placeholder="Düzenle…" autoFocus />
        <ThemedText variant="caption" muted style={{ marginTop: 4, marginLeft: 4 }} onPress={() => setEditing(null)}>Vazgeç</ThemedText>
      </View>
    ) : null;

  const renderReply = (r: CommentReply, depth: number): React.ReactNode => (
    <View key={r.id} style={{ marginLeft: depth === 1 ? 44 : 30, marginTop: spacing.sm }}>
      <Pressable onLongPress={r.authorUserId === profile?.id ? () => ownMenu(r.id, "reply", r.text) : undefined} delayLongPress={350}>
        <Bubble username={r.authorUsername} userId={r.authorUserId} image={r.authorImage} frameColor={r.profileFrame} frameTier={r.frameTier} text={r.text} avatarSize={26} />
      </Pressable>
      {editBox(r.id, "reply")}
      {r.replies.map((r2) => renderReply(r2, depth + 1))}
    </View>
  );

  return (
    <View>
      <Bubble
        username={comment.authorUsername}
        userId={comment.authorUserId}
        image={comment.authorImage}
        frameColor={comment.profileFrame}
        frameTier={comment.frameTier}
        text={comment.text}
        quote={quote}
        meta={
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 12, paddingTop: 4 }}>
            <ThemedText variant="caption" muted>{relativeTime(comment.date)}</ThemedText>
            {comment.authorScore != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <StarIcon size={11} color={colors.accent} fill={colors.accent} />
                <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>{comment.authorScore}/10</ThemedText>
              </View>
            )}
            <ThemedText variant="caption" color={showReplyBox ? colors.accent : colors.textMuted} style={{ fontWeight: "700" }} onPress={() => setShowReplyBox((v) => !v)}>
              Yanıtla
            </ThemedText>
            {comment.authorUserId === profile?.id && (
              <ThemedText variant="caption" color={colors.textMuted} style={{ fontWeight: "700" }} onPress={() => ownMenu(comment.id, "comment", comment.text)}>
                Düzenle · Sil
              </ThemedText>
            )}
          </View>
        }
      />
      {editBox(comment.id, "comment")}
      {comment.replies.map((r) => renderReply(r, 1))}
      {showReplyBox && (
        <View style={{ marginLeft: 44, marginTop: spacing.sm }}>
          <ComposerBar
            bordered={false}
            value={replyText}
            onChangeText={setReplyText}
            onSend={submitReply}
            sending={saving}
            canSend={replyText.trim().length >= 2}
            placeholder={`@${comment.authorUsername} kullanıcısına yanıt ver…`}
            autoFocus
          />
        </View>
      )}
    </View>
  );
}
