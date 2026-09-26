import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { getBook, rateBook, toggleBookLike, addBookComment, addCommentReply, type BookDetailResponse, type BookComment } from "@/api/book";
import { setLibraryStatus, type ReadStatus } from "@/api/library";
import { relativeTime } from "@/lib/relativeTime";
import { getMyLists, addBookToList, type UserListSummary } from "@/api/lists";

const STATUS_LABELS: Record<ReadStatus, string> = {
  currentRead: "Okuyorum",
  finishRead: "Okudum",
  targetRead: "Okuyacağım",
  dropRead: "Yarıda Bıraktım",
};
const STATUS_ORDER: ReadStatus[] = ["currentRead", "finishRead", "targetRead", "dropRead"];

export default function BookDetailScreen() {
  const { colors, spacing, radius, fontFamily } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
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

  const load = useCallback(async (ignore?: { current: boolean }) => {
    try {
      const result = await getBook(slug);
      if (!ignore?.current) {
        setData(result);
        setError(null);
      }
    } catch {
      if (!ignore?.current) setError("Kitap yüklenemedi.");
    }
  }, [slug]);

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

  async function pickStatus(status: ReadStatus) {
    if (!data) return;
    setStatusSaving(true);
    try {
      await setLibraryStatus(data.book.id, status);
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
      const result = await getMyLists();
      setMyLists(result.lists);
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
    setLikeSaving(true);
    try {
      await toggleBookLike(slug);
      await load();
    } finally {
      setLikeSaving(false);
    }
  }

  async function submitComment() {
    const trimmed = commentText.trim();
    if (trimmed.length < 2) return;
    setCommentSaving(true);
    try {
      await addBookComment(slug, trimmed);
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>
          {error ?? "Kitap bulunamadı."}
        </ThemedText>
      </View>
    );
  }

  const { book, displayScore, pooledEditionCount, ratingCount, myRating, myStatus, likeCount, liked, comments } = data;
  const writerNames = book.writers.map((w) => w.name).join(", ");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <BookCover id={book.id} title={book.name} author={writerNames} width={110} height={160} hasImage={book.hasImage} />
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.xs }}>
          <ThemedText variant="headline">{book.name}</ThemedText>
          {book.writers.length > 0 && (
            <ThemedText variant="body" muted>
              {book.writers.map((w, i) => (
                <ThemedText key={w.id} variant="body" muted onPress={() => router.push({ pathname: "/yazar/[slug]", params: { slug: w.slug } })}>
                  {w.name}{i < book.writers.length - 1 ? ", " : ""}
                </ThemedText>
              ))}
            </ThemedText>
          )}
          {book.publisher && (
            <ThemedText variant="caption" muted onPress={() => router.push({ pathname: "/yayinevi/[slug]", params: { slug: book.publisher!.slug } })}>
              {book.publisher.name}
            </ThemedText>
          )}
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginTop: spacing.xs }}>
            <ThemedText variant="title" color={colors.accent700}>
              {displayScore.toFixed(1)}/10
            </ThemedText>
            {ratingCount > 0 && (
              <ThemedText variant="caption" muted>
                ({ratingCount} oy{pooledEditionCount ? `, ${pooledEditionCount} baskı` : ""})
              </ThemedText>
            )}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button
          title={liked ? `Beğenildi ✓ (${likeCount})` : `Beğen (${likeCount})`}
          variant={liked ? "primary" : "secondary"}
          onPress={onToggleLike}
          disabled={likeSaving}
          style={{ flex: 1 }}
        />
        <Button title="Listeye Ekle" variant="secondary" onPress={onOpenListPicker} style={{ flex: 1 }} />
      </View>

      {showListPicker && (
        <View style={{ gap: spacing.xs, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, padding: spacing.md }}>
          {myLists && myLists.length === 0 && (
            <ThemedText variant="body" muted>Henüz bir listen yok - önce Listelerim&apos;den bir liste oluştur.</ThemedText>
          )}
          {myLists?.map((l) => (
            <Pressable key={l.id} onPress={() => onAddToList(l.slug)} style={{ paddingVertical: spacing.xs }}>
              <ThemedText variant="body">{l.title}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>
          Okuma Durumu
        </ThemedText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          {STATUS_ORDER.map((s) => {
            const active = myStatus?.status === s;
            return (
              <Pressable
                key={s}
                disabled={statusSaving}
                onPress={() => pickStatus(s)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: active ? colors.accent : colors.divider,
                  backgroundColor: active ? `${colors.accent}1F` : "transparent",
                  opacity: statusSaving ? 0.5 : 1,
                }}
              >
                <ThemedText variant="bodySemibold" color={active ? colors.accent : colors.text}>
                  {STATUS_LABELS[s]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>
          Puanın {myRating ? `(${myRating}/10)` : ""}
        </ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <Pressable key={n} disabled={rateSaving} onPress={() => submitRating(n)} hitSlop={4}>
              <ThemedText
                variant="title"
                color={myRating != null && n <= myRating ? colors.accent : colors.neutral400}
                style={{ fontFamily: fontFamily.headingSemibold, fontSize: 20 }}
              >
                ★
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {(book.content || book.aiSummary) && (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="label" color={colors.textMuted}>
            {book.content ? "Açıklama" : "Yapay Zeka Özeti"}
          </ThemedText>
          <ThemedText variant="body">{book.content ?? book.aiSummary}</ThemedText>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>
          Yorumlar ({comments.length})
        </ThemedText>

        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <TextField label="" value={commentText} onChangeText={setCommentText} placeholder="Bir yorum yaz…" multiline />
          </View>
          <Button title="Gönder" onPress={submitComment} disabled={commentSaving || commentText.trim().length < 2} />
        </View>

        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} onReplied={load} />
        ))}
      </View>
    </ScrollView>
  );
}

function CommentRow({ comment, onReplied }: { comment: BookComment; onReplied: () => Promise<void> }) {
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

  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        onPress={() => router.push({ pathname: "/profil/[username]", params: { username: comment.authorUsername } })}
        style={{ flexDirection: "row", gap: spacing.sm }}
      >
        <Avatar id={comment.authorUserId} name={comment.authorUsername} imageUrl={comment.authorImage} size={32} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "baseline" }}>
            <ThemedText variant="bodySemibold">@{comment.authorUsername}</ThemedText>
            <ThemedText variant="caption" muted>{relativeTime(comment.date)}</ThemedText>
          </View>
          <ThemedText variant="body">{comment.text}</ThemedText>
        </View>
      </Pressable>

      <Pressable onPress={() => setShowReplyBox((v) => !v)} style={{ marginLeft: 44 }}>
        <ThemedText variant="caption" color={colors.accent}>Yanıtla</ThemedText>
      </Pressable>

      {showReplyBox && (
        <View style={{ flexDirection: "row", gap: spacing.xs, marginLeft: 44, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <TextField label="" value={replyText} onChangeText={setReplyText} placeholder="Yanıt yaz…" />
          </View>
          <Button title="Gönder" onPress={submitReply} disabled={saving || replyText.trim().length < 2} />
        </View>
      )}

      {comment.replies.map((r) => (
        <View key={r.id} style={{ marginLeft: 44, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "baseline" }}>
            <ThemedText variant="bodySemibold">@{r.authorUsername}</ThemedText>
          </View>
          <ThemedText variant="body">{r.text}</ThemedText>
          {r.replies.map((r2) => (
            <View key={r2.id} style={{ marginLeft: 20, gap: 2 }}>
              <ThemedText variant="bodySemibold">@{r2.authorUsername}</ThemedText>
              <ThemedText variant="body">{r2.text}</ThemedText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
