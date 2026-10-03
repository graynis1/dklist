import { useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { Building2Icon, ClockIcon, CheckCircle2Icon, XCircleIcon, SearchIcon, XIcon, CheckIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { apiFetch } from "@/api/client";
import { searchSubmitOptions, type PickOption } from "@/api/contribute";

interface AppStatus {
  id: number;
  status: "pending" | "approved" | "rejected";
  reviewerNote: string | null;
  submittedAt: string;
}

/** Publisher-account application (customer: like the Yazarhane application, for publishers). */
export default function YayineviBasvuruScreen() {
  const { colors, spacing, radius, fontFamily } = useTheme();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<AppStatus | null>(null);
  const [isPublisher, setIsPublisher] = useState(false);
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickOption[]>([]);
  const [picked, setPicked] = useState<PickOption | null>(null);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    apiFetch<{ status: "ok"; application: AppStatus | null; isPublisher: boolean }>("/publisher-application")
      .then((r) => {
        setApp(r.application);
        setIsPublisher(r.isPublisher);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function onQuery(text: string) {
    setQ(text);
    const s = ++seq.current;
    if (text.trim().length < 2) return setResults([]);
    try {
      const r = await searchSubmitOptions("publisher", text);
      if (s === seq.current) setResults(r.slice(0, 5));
    } catch {
      /* optional */
    }
  }

  async function submit() {
    setSaving(true);
    try {
      await apiFetch("/publisher-application", { method: "POST", body: JSON.stringify({ message: message.trim(), publisherId: picked?.id ?? null }) });
      setApp({ id: 0, status: "pending", reviewerNote: null, submittedAt: "" });
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Başvuru gönderilemedi.");
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

  const state = isPublisher ? "approved" : app?.status === "pending" ? "pending" : null;

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
            <Building2Icon size={30} color={colors.accent700} />
          </View>
          <ThemedText variant="headline" style={{ textAlign: "center", fontSize: 21 }}>Yayınevi üyeliği</ThemedText>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>
            Yayınevi hesabıyla kitaplarınızı kataloğa ekler, yayınevi sayfanızı yönetirsiniz. Başvurunuz ekibimizce incelenir.
          </ThemedText>
        </View>

        {state === "approved" ? (
          <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card }}>
            <CheckCircle2Icon size={24} color="#3f8a5a" />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="bodySemibold">Yayınevi hesabınız aktif</ThemedText>
              <ThemedText variant="caption" muted>Kitap ekleyebilir, kataloğu güncelleyebilirsiniz.</ThemedText>
            </View>
            <Pressable onPress={() => router.push("/kitap/yeni")} style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.accent700 : colors.accent })}>
              <ThemedText variant="bodySemibold" color="#fff" style={{ fontSize: 13.5 }}>Kitap ekle</ThemedText>
            </Pressable>
          </View>
        ) : state === "pending" ? (
          <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.accent100 }}>
            <ClockIcon size={24} color={colors.accent700} />
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="bodySemibold" color={colors.accent800}>Başvurunuz inceleniyor</ThemedText>
              <ThemedText variant="caption" color={colors.accent700}>Sonuçlandığında bildirim alacaksınız.</ThemedText>
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card }}>
            {app?.status === "rejected" && (
              <View style={{ flexDirection: "row", gap: 8, padding: spacing.sm, borderRadius: radius.md, backgroundColor: "#fdecea" }}>
                <XCircleIcon size={16} color="#b3261e" />
                <ThemedText variant="caption" color="#b3261e" style={{ flex: 1 }}>
                  Önceki başvurunuz reddedildi{app.reviewerNote ? `: ${app.reviewerNote}` : "."} Tekrar başvurabilirsiniz.
                </ThemedText>
              </View>
            )}

            <View style={{ gap: 6 }}>
              <ThemedText variant="bodySemibold" style={{ fontSize: 14 }}>Katalogdaki yayınevi kaydı (varsa)</ThemedText>
              {picked ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingVertical: 6, paddingLeft: 12, paddingRight: 6, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
                  <CheckIcon size={14} color={colors.accent800} />
                  <ThemedText variant="bodySemibold" color={colors.accent800}>{picked.label}</ThemedText>
                  <Pressable onPress={() => setPicked(null)} hitSlop={6} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent200, alignItems: "center", justifyContent: "center" }}>
                    <XIcon size={12} color={colors.accent800} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ borderRadius: radius.lg, backgroundColor: colors.neutral200, overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
                    <SearchIcon size={16} color={colors.textMuted} />
                    <TextInput value={q} onChangeText={onQuery} placeholder="Yayınevinizin adını arayın" placeholderTextColor={colors.neutral500} style={{ flex: 1, height: 46, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text }} />
                  </View>
                  {results.map((o) => (
                    <Pressable key={o.id} onPress={() => { setPicked(o); setQ(""); setResults([]); }} style={({ pressed }) => ({ paddingVertical: 11, paddingHorizontal: 12, backgroundColor: pressed ? colors.neutral300 : colors.card })}>
                      <ThemedText variant="body">{o.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText variant="bodySemibold" style={{ fontSize: 14 }}>Yayınevi ve iletişim bilgileri</ThemedText>
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={1000}
                placeholder="Yayınevinizin adı, web siteniz, sizin görevinizi ve size ulaşabileceğimiz e-posta/telefon bilgisini yazın."
                placeholderTextColor={colors.neutral500}
                style={{ minHeight: 120, borderRadius: radius.lg, padding: 12, backgroundColor: colors.neutral200, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text, textAlignVertical: "top" }}
              />
            </View>

            <Pressable
              onPress={submit}
              disabled={saving || message.trim().length < 10}
              style={({ pressed }) => ({ height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: message.trim().length < 10 ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <ThemedText variant="bodySemibold" color="#fff">Başvuruyu Gönder</ThemedText>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardScreen>
  );
}
