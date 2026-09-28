import { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, RefreshControl, TextInput, Alert, FlatList } from "react-native";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { PenLineIcon, FeatherIcon, ClockIcon, XCircleIcon, SendIcon, UsersIcon, SearchIcon, XIcon, CheckIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { AuthorPostCard } from "@/components/AuthorPostCard";
import { getYazarhane, createAuthorPost, applyForYazarhane, type YazarhaneHome } from "@/api/yazarhane";
import { searchSubmitOptions, type PickOption } from "@/api/contribute";

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { colors, radius, fontFamily } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.neutral500}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.divider,
          borderRadius: radius.lg,
          backgroundColor: colors.neutral100,
          paddingHorizontal: 12,
          paddingVertical: props.multiline ? 12 : 0,
          minHeight: 46,
          fontSize: 15,
          fontFamily: fontFamily.bodyRegular,
          color: colors.text,
          textAlignVertical: props.multiline ? "top" : "center",
        },
        props.style,
      ]}
    />
  );
}

function ComposeCard({ onPosted }: { onPosted: () => void }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const ready = title.trim().length > 0 && content.trim().length > 0;

  async function submit() {
    setSaving(true);
    try {
      await createAuthorPost(title.trim(), content.trim());
      setTitle("");
      setContent("");
      setOpen(false);
      onPosted();
    } catch (err) {
      Alert.alert("Paylaşılamadı", err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, borderWidth: 1, borderColor: colors.divider, ...shadow.sm })}
      >
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
          <FeatherIcon size={20} color="#fff" />
        </View>
        <View style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: colors.neutral200, justifyContent: "center", paddingHorizontal: 14 }}>
          <ThemedText variant="body" muted>Okurlarına bugün ne yazmak istersin?</ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, ...shadow.md }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>Yeni paylaşım</ThemedText>
        <Pressable onPress={() => setOpen(false)} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
          <XIcon size={16} color={colors.text} />
        </Pressable>
      </View>
      <Input value={title} onChangeText={setTitle} placeholder="Başlık" maxLength={200} autoFocus />
      <Input value={content} onChangeText={setContent} placeholder="Yazını buraya yaz…" multiline style={{ minHeight: 160 }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <ThemedText variant="caption" muted style={{ flex: 1 }}>{content.length} karakter · paylaşım puan kazandırır</ThemedText>
        <Pressable
          onPress={submit}
          disabled={!ready || saving}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 42, paddingHorizontal: 16, borderRadius: radius.lg, backgroundColor: !ready ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <SendIcon size={16} color="#fff" />}
          <ThemedText variant="bodySemibold" color="#fff">Paylaş</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function ApplicationCard({ data, onApplied }: { data: YazarhaneHome; onApplied: () => void }) {
  const { colors, spacing, radius, shadow, fontFamily } = useTheme();
  const [message, setMessage] = useState("");
  const [writer, setWriter] = useState<PickOption | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickOption[]>([]);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);
  const app = data.myApplication;

  if (app?.status === "pending") {
    return (
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.accent100 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
          <ClockIcon size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title" color={colors.accent800}>Başvurun inceleniyor</ThemedText>
          <ThemedText variant="caption" color={colors.accent700}>Onaylandığında Yazarhane&apos;de paylaşım yapabileceksin. Bildirim alacaksın.</ThemedText>
        </View>
      </View>
    );
  }

  async function onQuery(text: string) {
    setQ(text);
    const s = ++seq.current;
    if (text.trim().length < 2) return setResults([]);
    try {
      const r = await searchSubmitOptions("writer", text);
      if (s === seq.current) setResults(r.slice(0, 5));
    } catch {
      /* optional field */
    }
  }

  async function submit() {
    setSaving(true);
    try {
      await applyForYazarhane(message.trim(), writer?.id ?? null);
      onApplied();
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Başvuru gönderilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, ...shadow.sm }}>
      <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
          <PenLineIcon size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title" style={{ fontSize: 18 }}>Yazarhane&apos;de yazmak ister misin?</ThemedText>
          <ThemedText variant="caption" muted>Yazar hesabı ile paylaşım yapar, kataloğa kitap eklersin.</ThemedText>
        </View>
      </View>

      {app?.status === "rejected" && (
        <View style={{ flexDirection: "row", gap: 8, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: "#fdecea" }}>
          <XCircleIcon size={16} color="#b3261e" />
          <ThemedText variant="caption" color="#b3261e" style={{ flex: 1 }}>
            Önceki başvurun reddedildi{app.reviewerNote ? `: ${app.reviewerNote}` : "."} Tekrar başvurabilirsin.
          </ThemedText>
        </View>
      )}

      <Input value={message} onChangeText={setMessage} placeholder="Kendini ve neden Yazarhane'de yazmak istediğini kısaca anlat…" multiline maxLength={1000} style={{ minHeight: 110 }} />

      <View style={{ gap: 6 }}>
        <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>Katalogdaki yazar kaydın (opsiyonel)</ThemedText>
        {writer ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6, paddingLeft: 12, paddingRight: 6, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
            <CheckIcon size={14} color={colors.accent800} />
            <ThemedText variant="bodySemibold" color={colors.accent800}>{writer.label}</ThemedText>
            <Pressable onPress={() => setWriter(null)} hitSlop={6} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent200, alignItems: "center", justifyContent: "center" }}>
              <XIcon size={12} color={colors.accent800} />
            </Pressable>
          </View>
        ) : (
          <View style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.neutral100, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
              <SearchIcon size={16} color={colors.textMuted} />
              <TextInput value={q} onChangeText={onQuery} placeholder="Gerçek bir yazarsan adını ara" placeholderTextColor={colors.neutral500} style={{ flex: 1, height: 46, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text }} />
            </View>
            {results.map((o) => (
              <Pressable key={o.id} onPress={() => { setWriter(o); setQ(""); setResults([]); }} style={({ pressed }) => ({ paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral200 : colors.card })}>
                <ThemedText variant="body">{o.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable
        onPress={submit}
        disabled={saving || message.trim().length < 10}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: radius.lg, backgroundColor: message.trim().length < 10 ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
      >
        {saving ? <ActivityIndicator size="small" color="#fff" /> : <SendIcon size={17} color="#fff" />}
        <ThemedText variant="bodySemibold" color="#fff">Başvuruyu Gönder</ThemedText>
      </Pressable>
      {message.trim().length > 0 && message.trim().length < 10 && (
        <ThemedText variant="caption" muted style={{ marginTop: -4 }}>Biraz daha ayrıntı yaz (en az 10 karakter).</ThemedText>
      )}
    </View>
  );
}

export default function YazarhaneScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [data, setData] = useState<YazarhaneHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getYazarhane());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yazarhane yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
        <EmptyState icon={<PenLineIcon size={30} color={colors.accent} />} title="Bir sorun oluştu" subtitle={error ?? undefined} actionLabel="Tekrar Dene" onAction={onRefresh} />
      </View>
    );
  }

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <LinearGradient colors={[colors.accent800, colors.accent500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ margin: spacing.lg, borderRadius: radius.xl, padding: spacing.xl, overflow: "hidden", ...shadow.md }}>
          <View style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <FeatherIcon size={30} color="#fff" />
          <ThemedText variant="display" color="#fff" style={{ marginTop: spacing.sm }}>Yazarhane</ThemedText>
          <ThemedText variant="body" color="rgba(255,255,255,0.85)" style={{ lineHeight: 21 }}>
            DKList&apos;e üye gerçek yazarların köşesi. Yeni yazılar, notlar ve okurlarla doğrudan bağ.
          </ThemedText>
          <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
            <ThemedText variant="bodySemibold" color="#fff">{data.members.length} <ThemedText variant="body" color="rgba(255,255,255,0.8)">yazar</ThemedText></ThemedText>
            <ThemedText variant="bodySemibold" color="#fff">{data.posts.length} <ThemedText variant="body" color="rgba(255,255,255,0.8)">son paylaşım</ThemedText></ThemedText>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
          {data.canPost && <ComposeCard onPosted={load} />}
          {data.canApply && <ApplicationCard data={data} onApplied={load} />}

          {data.members.length > 0 && (
            <View>
              <SectionHeader title="Yazarlar" count={data.members.length} />
              <FlatList
                data={data.members}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(m) => String(m.userId)}
                contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
                style={{ marginHorizontal: -spacing.lg, paddingLeft: spacing.lg }}
                renderItem={({ item: m }) => (
                  <Pressable
                    onPress={() => router.push({ pathname: "/yazarhane/[username]", params: { username: m.username } })}
                    style={({ pressed }) => ({ width: 140, alignItems: "center", gap: 6, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, borderWidth: 1, borderColor: colors.divider, ...shadow.sm })}
                  >
                    <Avatar id={m.userId} name={m.username} imageUrl={m.image} size={60} frameColor={m.profileFrame} frameTier={m.frameTier} />
                    <ThemedText variant="bodySemibold" numberOfLines={1}>@{m.username}</ThemedText>
                    {m.writerName ? <ThemedText variant="caption" muted numberOfLines={1}>{m.writerName}</ThemedText> : null}
                    <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
                      <ThemedText variant="caption" color={colors.accent700} style={{ fontSize: 11 }}>{m.postCount} paylaşım</ThemedText>
                    </View>
                  </Pressable>
                )}
              />
            </View>
          )}

          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Son paylaşımlar" />
            {data.posts.length === 0 ? (
              <EmptyState
                icon={data.members.length ? <PenLineIcon size={30} color={colors.accent} /> : <UsersIcon size={30} color={colors.accent} />}
                title="Henüz paylaşım yok"
                subtitle={data.canPost ? "İlk yazıyı sen paylaş, okurların seni burada bulsun." : "Yazarlar paylaşım yaptıkça burada göreceksin."}
              />
            ) : (
              data.posts.map((p) => <AuthorPostCard key={p.id} post={p} />)
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}
