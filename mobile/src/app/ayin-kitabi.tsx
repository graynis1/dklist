import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarHeartIcon, UsersIcon, CheckIcon, MessageSquareIcon, Share2Icon, BookOpenIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { getBookOfMonth, toggleBookOfMonth, type BookOfMonthEntry } from "@/api/discover";
import { shareLink } from "@/lib/share";

/** Ayın Kitabı - the community's monthly read: join it, discuss it on the
 * book's own page, browse earlier picks. Same data as web /ayin-kitabi. */
export default function AyinKitabiScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [current, setCurrent] = useState<BookOfMonthEntry | null>(null);
  const [past, setPast] = useState<BookOfMonthEntry[]>([]);
  const [participating, setParticipating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getBookOfMonth();
      setCurrent(r.current);
      setPast(r.past);
      setParticipating(r.participating);
    } catch {
      // keeps the previous state; pull to retry
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  async function onToggle() {
    if (!current) return;
    setSaving(true);
    try {
      const r = await toggleBookOfMonth();
      setParticipating(r.participating);
      setCurrent({ ...current, participantCount: current.participantCount + (r.participating ? 1 : -1) });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İşlem yapılamadı.");
    } finally {
      setSaving(false);
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing["3xl"] }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}>
      {current ? (
        <LinearGradient colors={[colors.accent800, colors.accent500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ margin: spacing.lg, borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", gap: spacing.md, overflow: "hidden", ...shadow.md }}>
          <View style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.18)" }}>
            <CalendarHeartIcon size={14} color="#fff" />
            <ThemedText variant="label" color="#fff" style={{ fontSize: 11 }}>{current.periodLabel}</ThemedText>
          </View>
          <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: current.bookSlug } })} style={{ borderRadius: 6, ...shadow.lg }}>
            <BookCover id={current.bookId} title={current.bookName} author={current.writers.join(", ")} width={140} height={208} hasImage={current.hasImage} />
          </Pressable>
          <View style={{ alignItems: "center", gap: 2 }}>
            <ThemedText variant="headline" color="#fff" style={{ fontSize: 26, textAlign: "center" }}>{current.bookName}</ThemedText>
            {current.writers.length > 0 && <ThemedText variant="bodySemibold" color={colors.accent200}>{current.writers.join(", ")}</ThemedText>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <UsersIcon size={15} color="rgba(255,255,255,0.9)" />
            <ThemedText variant="body" color="rgba(255,255,255,0.9)">{current.participantCount} okur birlikte okuyor</ThemedText>
          </View>
          <Pressable
            onPress={onToggle}
            disabled={saving}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 24, borderRadius: radius.lg, backgroundColor: participating ? "rgba(255,255,255,0.2)" : pressed ? colors.accent100 : "#fff", borderWidth: participating ? 1.5 : 0, borderColor: "#fff" })}
          >
            {saving ? <ActivityIndicator color={participating ? "#fff" : colors.accent} /> : participating ? <CheckIcon size={18} color="#fff" /> : <BookOpenIcon size={18} color={colors.accent800} />}
            <ThemedText variant="bodySemibold" color={participating ? "#fff" : colors.accent800}>{participating ? "Katılıyorsun" : "Ben de Okuyorum"}</ThemedText>
          </Pressable>
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: current.bookSlug } })} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <MessageSquareIcon size={15} color="#fff" />
              <ThemedText variant="bodySemibold" color="#fff" style={{ fontSize: 13.5 }}>Tartışmaya katıl</ThemedText>
            </Pressable>
            <Pressable onPress={() => shareLink(`Bu ayın kitabı: ${current.bookName} — DKList'te birlikte okuyoruz`, "https://dklist.com/ayin-kitabi")} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Share2Icon size={15} color="#fff" />
              <ThemedText variant="bodySemibold" color="#fff" style={{ fontSize: 13.5 }}>Paylaş</ThemedText>
            </Pressable>
          </View>
        </LinearGradient>
      ) : (
        <EmptyState icon={<CalendarHeartIcon size={30} color={colors.accent} />} title="Bu ay seçili kitap yok" subtitle="Yeni Ayın Kitabı seçildiğinde burada göreceksin." />
      )}

      {past.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SectionHeader title="Önceki seçkiler" count={past.length} />
          <View style={{ gap: spacing.sm }}>
            {past.map((p) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: p.bookSlug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
                <BookCover id={p.bookId} title={p.bookName} width={48} height={70} hasImage={p.hasImage} />
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText variant="label" color={colors.accent} style={{ fontSize: 10 }}>{p.periodLabel}</ThemedText>
                  <ThemedText variant="title" numberOfLines={2}>{p.bookName}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1}>{[p.writers.join(", "), `${p.participantCount} katılımcı`].filter(Boolean).join(" · ")}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
