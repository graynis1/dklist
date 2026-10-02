import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, Alert, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ChevronDownIcon, ChevronUpIcon, SendIcon, ShieldCheckIcon, FileTextIcon, CookieIcon, MailIcon, CheckCircle2Icon, LifeBuoyIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/EmptyState";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { getSupport, sendSupportTicket, type FaqCategory } from "@/api/discover";
import { API_BASE_URL } from "@/api/config";

const LEGAL = [
  { label: "Gizlilik Politikası", path: "/gizlilik-politikasi", Icon: ShieldCheckIcon },
  { label: "Kullanım Şartları", path: "/site-kullanim-sartlari", Icon: FileTextIcon },
  { label: "Çerez Politikası", path: "/cerez-politikasi", Icon: CookieIcon },
];

/** Yardım ve Destek - FAQ, a support ticket form (same queue the web uses,
 * answered from the admin panel) and the legal pages the stores require. */
export default function DestekScreen() {
  const { colors, spacing, radius, shadow, fontFamily } = useTheme();
  const { profile } = useAuth();
  const [categories, setCategories] = useState<FaqCategory[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [category, setCategory] = useState("diger");
  const [email, setEmail] = useState(profile?.mail ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getSupport()
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, []);

  async function submit() {
    setSending(true);
    try {
      await sendSupportTicket({ category, email: email.trim(), message: message.trim() });
      setSent(true);
      setMessage("");
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSending(false);
    }
  }

  const input = { borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.neutral100, paddingHorizontal: 12, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text } as const;

  return (
    <KeyboardScreen style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.accent100 }}>
          <LifeBuoyIcon size={30} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" style={{ fontSize: 18 }}>Nasıl yardımcı olabiliriz?</ThemedText>
            <ThemedText variant="caption" color={colors.accent800}>Sık sorulanlara göz at ya da bize yaz, en kısa sürede dönelim.</ThemedText>
          </View>
        </View>

        {categories.filter((c) => c.questions.length > 0).map((c) => (
          <View key={c.slug}>
            <ThemedText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>{c.label}</ThemedText>
            <View style={{ borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...shadow.sm }}>
              {c.questions.map((q, i) => {
                const key = `${c.slug}-${i}`;
                const isOpen = open === key;
                return (
                  <Pressable key={key} onPress={() => setOpen(isOpen ? null : key)} style={{ padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider, gap: spacing.xs }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                      <ThemedText variant="bodySemibold" style={{ flex: 1 }}>{q.q}</ThemedText>
                      {isOpen ? <ChevronUpIcon size={18} color={colors.textMuted} /> : <ChevronDownIcon size={18} color={colors.textMuted} />}
                    </View>
                    {isOpen && <ThemedText variant="body" muted style={{ lineHeight: 21 }}>{q.a}</ThemedText>}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, ...shadow.sm }}>
          <SectionHeader title="Bize yaz" />
          {sent ? (
            <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
              <CheckCircle2Icon size={34} color={colors.accent} />
              <ThemedText variant="title">Mesajın bize ulaştı</ThemedText>
              <ThemedText variant="caption" muted style={{ textAlign: "center" }}>Yanıtımız bildirim ve e-posta olarak gelecek.</ThemedText>
              <ThemedText variant="bodySemibold" color={colors.accent} onPress={() => setSent(false)}>Yeni mesaj yaz</ThemedText>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {categories.map((c) => (
                  <Pressable key={c.slug} onPress={() => setCategory(c.slug)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: category === c.slug ? colors.accent : colors.neutral200 }}>
                    <ThemedText variant="caption" color={category === c.slug ? "#fff" : colors.text} style={{ fontWeight: "600" }}>{c.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
              <TextInput value={email} onChangeText={setEmail} placeholder="E-posta adresin" placeholderTextColor={colors.neutral500} keyboardType="email-address" autoCapitalize="none" style={{ ...input, height: 46 }} />
              <TextInput value={message} onChangeText={(t) => setMessage(t.slice(0, 1000))} placeholder="Mesajın…" placeholderTextColor={colors.neutral500} multiline style={{ ...input, minHeight: 120, paddingVertical: 12, textAlignVertical: "top" }} />
              <Pressable
                onPress={submit}
                disabled={sending || message.trim().length < 5 || !email.trim()}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: radius.lg, backgroundColor: message.trim().length < 5 || !email.trim() ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <SendIcon size={17} color="#fff" />}
                <ThemedText variant="bodySemibold" color="#fff">Gönder</ThemedText>
              </Pressable>
            </>
          )}
        </View>

        <View>
          <ThemedText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>Yasal</ThemedText>
          <View style={{ borderRadius: radius.lg, backgroundColor: colors.card, overflow: "hidden", ...shadow.sm }}>
            {LEGAL.map((l, i) => (
              <Pressable key={l.path} onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}${l.path}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral100 : colors.card })}>
                <l.Icon size={18} color={colors.textMuted} />
                <ThemedText variant="body" style={{ flex: 1 }}>{l.label}</ThemedText>
              </Pressable>
            ))}
            <Pressable onPress={() => Linking.openURL("mailto:destek@dklist.com").catch(() => {})} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral100 : colors.card })}>
              <MailIcon size={18} color={colors.textMuted} />
              <ThemedText variant="body" style={{ flex: 1 }}>destek@dklist.com</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}
