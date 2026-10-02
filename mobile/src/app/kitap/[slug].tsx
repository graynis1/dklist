import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert, Image } from "react-native";
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
  FileTextIcon,
  EyeIcon,
  MessageSquareIcon,
  XIcon,
  CheckIcon,
  QuoteIcon,
} from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { ComposerBar } from "@/components/ComposerBar";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { getBook, rateBook, toggleBookLike, addBookComment, addCommentReply, type BookDetailResponse, type BookComment, type CommentReply } from "@/api/book";
import { setLibraryStatus, type ReadStatus } from "@/api/library";
import { relativeTime } from "@/lib/relativeTime";
import { getMyLists, addBookToList, type UserListSummary } from "@/api/lists";
import { API_BASE_URL } from "@/api/config";
import { pickDropReason, type DropReason } from "@/lib/dropReason";

const STATUS: { key: ReadStatus; label: string; Icon: typeof BookOpenIcon }[] = [
  { key: "currentRead", label: "Okuyorum", Icon: BookOpenIcon },
  { key: "finishRead", label: "Okudum", Icon: CheckCircle2Icon },
  { key: "targetRead", label: "Okuyacağım", Icon: BookmarkIcon },
  { key: "dropRead", label: "Yarıda Bıraktım", Icon: PauseCircleIcon },
];

const LANG_LABEL: Record<string, string> = { tur: "Türkçe", tr: "Türkçe", eng: "İngilizce", en: "İngilizce", ger: "Almanca", fre: "Fransızca", rus: "Rusça", spa: "İspanyolca", ita: "İtalyanca", ara: "Arapça" };

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { colors, spacing, shadow } = useTheme();
  return <View style={[{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, ...shadow.sm }, style]}>{children}</View>;
}

export default function BookDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
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

  useEffect(() => {
    navigation.setOptions({ title: data?.book.name ?? "" });
  }, [navigation, data?.book.name]);

  function pickStatus(status: ReadStatus) {
    if (!data) return;
    const clearing = data.myStatus?.status === status;
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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
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

  const stats = [
    { Icon: StarIcon, value: displayScore > 0 ? displayScore.toFixed(1) : "—", label: `${ratingCount} oy` },
    { Icon: HeartIcon, value: String(likeCount), label: "beğeni" },
    { Icon: FileTextIcon, value: book.pageNumber > 0 ? String(book.pageNumber) : "—", label: "sayfa" },
    { Icon: EyeIcon, value: book.viewCount > 999 ? `${(book.viewCount / 1000).toFixed(1)}B` : String(book.viewCount), label: "görüntülenme" },
  ];

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={{ overflow: "hidden" }}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} blurRadius={24} style={{ position: "absolute", top: -20, left: -20, right: -20, bottom: -20 }} resizeMode="cover" />
          ) : null}
          <LinearGradient
            colors={coverUrl ? ["rgba(20,18,16,0.55)", "rgba(20,18,16,0.85)"] : [colors.accent700, colors.accent900]}
            style={{ alignItems: "center", paddingTop: spacing.xl, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm }}
          >
            <View style={{ borderRadius: 6, ...shadow.lg }}>
              <BookCover id={book.id} title={book.name} author={writerNames} width={132} height={196} hasImage={book.hasImage} />
            </View>
            <ThemedText variant="headline" color="#fff" style={{ textAlign: "center", fontSize: 26, marginTop: spacing.sm }}>
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
            {book.categories.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 2 }}>
                {book.categories.slice(0, 3).map((c) => (
                  <Pressable key={c.id} onPress={() => router.push({ pathname: "/kategori/[slug]", params: { slug: c.slug } })} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.16)" }}>
                    <ThemedText variant="caption" color="#fff">{c.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Stats + actions */}
        <View style={{ backgroundColor: colors.card, ...shadow.sm }}>
          <View style={{ flexDirection: "row", paddingVertical: spacing.md }}>
            {stats.map((s, i) => (
              <View key={s.label} style={{ flex: 1, alignItems: "center", gap: 2, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: colors.divider }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <s.Icon size={14} color={colors.accent} fill={s.Icon === StarIcon ? colors.accent : "transparent"} />
                  <ThemedText variant="title" style={{ fontSize: 17 }}>{s.value}</ThemedText>
                </View>
                <ThemedText variant="caption" muted style={{ fontSize: 11 }}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.lg }} />
          <View style={{ flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
            {[
              { key: "like", label: liked ? "Beğendin" : "Beğen", Icon: HeartIcon, on: liked, onPress: onToggleLike, disabled: likeSaving },
              { key: "list", label: "Listeye Ekle", Icon: ListPlusIcon, on: showListPicker, onPress: onOpenListPicker, disabled: false },
              { key: "share", label: "Paylaş", Icon: Share2Icon, on: false, onPress: onShare, disabled: false },
            ].map((a) => (
              <Pressable
                key={a.key}
                onPress={a.onPress}
                disabled={a.disabled}
                style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
              >
                <a.Icon size={19} color={a.on ? colors.accent : colors.textMuted} fill={a.key === "like" && a.on ? colors.accent : "transparent"} />
                <ThemedText variant="bodySemibold" color={a.on ? colors.accent : colors.textMuted} style={{ fontSize: 13.5 }}>{a.label}</ThemedText>
              </Pressable>
            ))}
          </View>
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

        {/* Reading status */}
        <Card>
          <SectionHeader title="Okuma durumun" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {STATUS.map(({ key, label, Icon }) => {
              const active = myStatus?.status === key;
              return (
                <Pressable
                  key={key}
                  disabled={statusSaving}
                  onPress={() => pickStatus(key)}
                  style={({ pressed }) => ({
                    width: "48.7%",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    paddingVertical: 11,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.lg,
                    backgroundColor: active ? colors.accent : pressed ? colors.neutral300 : colors.neutral200,
                    opacity: statusSaving ? 0.6 : 1,
                  })}
                >
                  <Icon size={18} color={active ? "#fff" : colors.accent} />
                  <ThemedText variant="bodySemibold" color={active ? "#fff" : colors.text} style={{ flex: 1, fontSize: 13.5 }} numberOfLines={1}>
                    {label}
                  </ThemedText>
                  {active && <CheckIcon size={16} color="#fff" />}
                </Pressable>
              );
            })}
          </View>
          {myStatus && (
            <ThemedText variant="caption" muted style={{ marginTop: spacing.sm }}>
              Rafından çıkarmak için seçili duruma tekrar dokun.
            </ThemedText>
          )}
        </Card>

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
                <Pressable key={n} disabled={rateSaving} onPress={() => submitRating(n)} hitSlop={4} style={{ alignItems: "center", gap: 2 }}>
                  <StarIcon size={26} color={on ? colors.accent : colors.neutral400} fill={on ? colors.accent : "transparent"} strokeWidth={1.6} />
                  <ThemedText variant="caption" muted style={{ fontSize: 9.5 }}>{n}</ThemedText>
                </Pressable>
              );
            })}
          </View>
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

  const renderReply = (r: CommentReply, depth: number): React.ReactNode => (
    <View key={r.id} style={{ marginLeft: depth === 1 ? 44 : 30, marginTop: spacing.sm }}>
      <Bubble username={r.authorUsername} userId={r.authorUserId} image={r.authorImage} frameColor={r.profileFrame} frameTier={r.frameTier} text={r.text} avatarSize={26} />
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
          </View>
        }
      />
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
