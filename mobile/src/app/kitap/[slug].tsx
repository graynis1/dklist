import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { getBook, rateBook, type BookDetailResponse } from "@/api/book";
import { setLibraryStatus, type ReadStatus } from "@/api/library";

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

  const { book, displayScore, pooledEditionCount, ratingCount, myRating, myStatus } = data;
  const writerNames = book.writers.map((w) => w.name).join(", ");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <BookCover id={book.id} title={book.name} author={writerNames} width={110} height={160} />
        <View style={{ flex: 1, justifyContent: "center", gap: spacing.xs }}>
          <ThemedText variant="headline">{book.name}</ThemedText>
          {writerNames && (
            <ThemedText variant="body" muted>
              {writerNames}
            </ThemedText>
          )}
          {book.publisher && (
            <ThemedText variant="caption" muted>
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
    </ScrollView>
  );
}
