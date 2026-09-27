import { useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScanBarcodeIcon, XIcon, PlusIcon, BookPlusIcon, CheckCircle2Icon, CheckIcon, LockIcon, SearchIcon, InfoIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { getSubmitMeta, searchSubmitOptions, submitBook, type PickOption, type PickType, type SubmitMeta } from "@/api/contribute";

const LANGS = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "İngilizce" },
  { code: "de", label: "Almanca" },
  { code: "fr", label: "Fransızca" },
  { code: "ru", label: "Rusça" },
  { code: "es", label: "İspanyolca" },
  { code: "ar", label: "Arapça" },
];
const FORMATS = ["Karton Kapak", "Ciltli", "Cep Boy", "E-Kitap", "Sesli Kitap"];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors, spacing, shadow } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, gap: spacing.md, ...shadow.sm }}>
      <View>
        <ThemedText variant="title" style={{ fontSize: 18 }}>{title}</ThemedText>
        {subtitle && <ThemedText variant="caption" muted style={{ marginTop: 2 }}>{subtitle}</ThemedText>}
      </View>
      {children}
    </View>
  );
}

function Field({ label, required, right, ...rest }: React.ComponentProps<typeof TextInput> & { label: string; required?: boolean; right?: React.ReactNode }) {
  const { colors, radius, fontFamily } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>
        {label}
        {required ? <ThemedText variant="bodySemibold" color={colors.accent}> *</ThemedText> : null}
      </ThemedText>
      <View style={{ flexDirection: "row", alignItems: rest.multiline ? "flex-start" : "center", borderWidth: 1, borderColor: focused ? colors.accent : colors.divider, borderRadius: radius.lg, backgroundColor: colors.neutral100, paddingHorizontal: 12 }}>
        <TextInput
          placeholderTextColor={colors.neutral500}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, minHeight: 46, paddingVertical: rest.multiline ? 12 : 0, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text, textAlignVertical: rest.multiline ? "top" : "center" }}
          {...rest}
        />
        {right}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200 }}>
      <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{label}</ThemedText>
    </Pressable>
  );
}

function EntityPicker({ type, label, required, multi, value, onChange, placeholder }: {
  type: PickType;
  label: string;
  required?: boolean;
  multi?: boolean;
  value: PickOption[];
  onChange: (v: PickOption[]) => void;
  placeholder: string;
}) {
  const { colors, radius, spacing, fontFamily } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickOption[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const full = !multi && value.length > 0;

  async function onQuery(text: string) {
    setQ(text);
    const s = ++seq.current;
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await searchSubmitOptions(type, text);
      if (s === seq.current) setResults(r.filter((o) => !value.some((v) => v.id === o.id)));
    } catch {
      if (s === seq.current) setResults([]);
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }

  function pick(o: PickOption) {
    onChange(multi ? [...value, o] : [o]);
    setQ("");
    setResults([]);
  }

  return (
    <View style={{ gap: 6 }}>
      <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>
        {label}
        {required ? <ThemedText variant="bodySemibold" color={colors.accent}> *</ThemedText> : null}
      </ThemedText>
      {value.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {value.map((v) => (
            <View key={v.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingLeft: 12, paddingRight: 6, borderRadius: radius.pill, backgroundColor: colors.accent100, maxWidth: "100%" }}>
              <ThemedText variant="bodySemibold" color={colors.accent800} numberOfLines={1} style={{ fontSize: 13.5, flexShrink: 1 }}>{v.label}</ThemedText>
              <Pressable onPress={() => onChange(value.filter((x) => x.id !== v.id))} hitSlop={6} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent200, alignItems: "center", justifyContent: "center" }}>
                <XIcon size={12} color={colors.accent800} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {!full && (
        <View style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, backgroundColor: colors.neutral100, overflow: "hidden" }}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
            <SearchIcon size={16} color={colors.textMuted} />
            <TextInput
              value={q}
              onChangeText={onQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.neutral500}
              style={{ flex: 1, height: 46, fontSize: 15, fontFamily: fontFamily.bodyRegular, color: colors.text }}
            />
            {loading && <ActivityIndicator size="small" color={colors.accent} />}
          </View>
          {results.map((o) => (
            <Pressable key={o.id} onPress={() => pick(o)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: pressed ? colors.neutral200 : colors.card })}>
              <PlusIcon size={16} color={colors.accent} />
              <ThemedText variant="body" numberOfLines={2} style={{ flex: 1 }}>{o.label}</ThemedText>
            </Pressable>
          ))}
          {q.trim().length >= 2 && !loading && results.length === 0 && (
            <ThemedText variant="caption" muted style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>Sonuç bulunamadı.</ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

export default function KitapEkleScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const params = useLocalSearchParams<{ isbn?: string; name?: string; pages?: string }>();
  const [meta, setMeta] = useState<SubmitMeta | null>(null);
  const [metaError, setMetaError] = useState(false);

  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [sameOrg, setSameOrg] = useState(true);
  const [isbn, setIsbn] = useState("");
  const [pages, setPages] = useState("");
  const [lang, setLang] = useState("tr");
  const [format, setFormat] = useState("");
  const [content, setContent] = useState("");
  const [writers, setWriters] = useState<PickOption[]>([]);
  const [publisher, setPublisher] = useState<PickOption[]>([]);
  const [translators, setTranslators] = useState<PickOption[]>([]);
  const [categories, setCategories] = useState<PickOption[]>([]);
  const [parent, setParent] = useState<PickOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ slug: string; approved: boolean } | null>(null);

  useEffect(() => {
    getSubmitMeta()
      .then(setMeta)
      .catch(() => setMetaError(true));
  }, []);

  // Prefill from a barcode scan (either the Barkod screen's "Kitap Ekle"
  // button or this form's own scan-to-fill button, which returns here with
  // new params) - applied once per distinct scan.
  const scanKey = `${params.isbn ?? ""}|${params.name ?? ""}|${params.pages ?? ""}`;
  const [appliedScanKey, setAppliedScanKey] = useState("||");
  if (scanKey !== appliedScanKey) {
    setAppliedScanKey(scanKey);
    if (params.isbn) setIsbn(params.isbn);
    if (params.name) setName(params.name);
    if (params.pages) setPages(params.pages);
  }

  const effectiveOrg = sameOrg ? name : orgName;
  const missing = [
    !name.trim() && "kitap adı",
    !effectiveOrg.trim() && "orijinal ad",
    publisher.length === 0 && "yayınevi",
    !(Number(pages) > 0) && "sayfa sayısı",
    !lang.trim() && "dil",
  ].filter(Boolean) as string[];

  async function onSubmit() {
    if (missing.length > 0) {
      Alert.alert("Eksik bilgi", `Lütfen doldur: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      const r = await submitBook({
        name: name.trim(),
        orgName: effectiveOrg.trim(),
        publisherId: publisher[0].id,
        lang: lang.trim(),
        pageNumber: Number(pages),
        format,
        isbn: isbn.replace(/[^0-9Xx]/g, ""),
        content: content.trim(),
        parentId: parent[0]?.id ?? null,
        writerIds: writers.map((w) => w.id),
        translatorIds: translators.map((t) => t.id),
        categoryIds: parent.length ? [] : categories.map((c) => c.id),
      });
      setDone({ slug: r.slug, approved: r.approved });
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Kitap eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setDone(null);
    setName("");
    setOrgName("");
    setSameOrg(true);
    setIsbn("");
    setPages("");
    setFormat("");
    setContent("");
    setWriters([]);
    setPublisher([]);
    setTranslators([]);
    setCategories([]);
    setParent([]);
  }

  if (!meta && !metaError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (metaError || !meta?.canSubmit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState
          icon={<LockIcon size={30} color={colors.accent} />}
          title="Kitap ekleme yetkin yok"
          subtitle="Kataloğa kitap ekleme; yazar, yayınevi ve moderatör hesaplarına açık. Yazarsan Yazarhane'ye başvurarak yazar hesabı alabilirsin."
          actionLabel="Yazarhane'ye Başvur"
          onAction={() => router.replace("/yazarhane")}
        />
      </View>
    );
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState
          icon={<CheckCircle2Icon size={32} color={colors.accent} />}
          title={done.approved ? "Kitap yayında!" : "Onaya gönderildi"}
          subtitle={done.approved ? "Kitap kataloğa eklendi ve herkes görebiliyor." : "Moderatörlerimiz kitabı inceledikten sonra katalogda yayınlanacak. Teşekkürler!"}
          actionLabel={done.approved ? "Kitabı Gör" : "Yeni Kitap Ekle"}
          onAction={() => (done.approved ? router.replace({ pathname: "/kitap/[slug]", params: { slug: done.slug } }) : resetForm())}
        />
        {done.approved && (
          <Pressable onPress={resetForm} style={{ alignSelf: "center" }}>
            <ThemedText variant="bodySemibold" color={colors.accent}>Başka bir kitap ekle</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing["3xl"] }}>
        <Pressable
          onPress={() => router.push({ pathname: "/barkod", params: { fill: "1" } })}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, margin: spacing.lg, marginBottom: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent700 : colors.accent, ...shadow.sm })}
        >
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <ScanBarcodeIcon size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" color="#fff">Barkodu tara, hızlı doldur</ThemedText>
            <ThemedText variant="caption" color="rgba(255,255,255,0.85)">ISBN, kitap adı ve sayfa sayısı otomatik gelsin</ThemedText>
          </View>
        </Pressable>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accent100 }}>
          <InfoIcon size={18} color={colors.accent700} />
          <ThemedText variant="caption" color={colors.accent800} style={{ flex: 1, lineHeight: 18 }}>
            {meta.autoApprove ? "Hesabın ile eklediğin kitaplar doğrudan yayınlanır." : "Eklediğin kitap, moderatör onayından sonra katalogda görünür."}
          </ThemedText>
        </View>

        <Section title="Kitap bilgileri">
          <Field label="Kitap adı" required value={name} onChangeText={setName} placeholder="Örn. Tutunamayanlar" />
          <View style={{ gap: 8 }}>
            <Pressable onPress={() => setSameOrg((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.accent, backgroundColor: sameOrg ? colors.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
                {sameOrg && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </View>
              <ThemedText variant="body">Orijinal adı kitap adıyla aynı</ThemedText>
            </Pressable>
            {!sameOrg && <Field label="Orijinal adı" required value={orgName} onChangeText={setOrgName} placeholder="Örn. The Disconnected" />}
          </View>
          <Field
            label="ISBN"
            value={isbn}
            onChangeText={(t) => setIsbn(t.replace(/[^0-9Xx-]/g, ""))}
            keyboardType="number-pad"
            placeholder="978…"
            right={
              <Pressable onPress={() => router.push({ pathname: "/barkod", params: { fill: "1" } })} hitSlop={8} style={{ padding: 6 }}>
                <ScanBarcodeIcon size={20} color={colors.accent} />
              </Pressable>
            }
          />
          <Field label="Sayfa sayısı" required value={pages} onChangeText={(t) => setPages(t.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Örn. 724" />
          <View style={{ gap: 8 }}>
            <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>
              Dil<ThemedText variant="bodySemibold" color={colors.accent}> *</ThemedText>
            </ThemedText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {LANGS.map((l) => (
                <Chip key={l.code} label={l.label} on={lang === l.code} onPress={() => setLang(l.code)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>Format</ThemedText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {FORMATS.map((f) => (
                <Chip key={f} label={f} on={format === f} onPress={() => setFormat(format === f ? "" : f)} />
              ))}
            </View>
          </View>
        </Section>

        <Section title="Yazar ve yayınevi">
          <EntityPicker type="writer" label="Yazar(lar)" multi value={writers} onChange={setWriters} placeholder="Yazar ara…" />
          <EntityPicker type="publisher" label="Yayınevi" required value={publisher} onChange={setPublisher} placeholder="Yayınevi ara…" />
          <EntityPicker type="translator" label="Çevirmen(ler)" multi value={translators} onChange={setTranslators} placeholder="Çevirmen ara (çeviri ise)…" />
        </Section>

        <Section title="Baskı / çeviri" subtitle="Bu kitap katalogdaki bir eserin başka bir baskısı ya da çevirisiyse seç; kategoriler ondan alınır.">
          <EntityPicker type="parent" label="Asıl eser (opsiyonel)" value={parent} onChange={setParent} placeholder="Asıl eserin adını yaz…" />
        </Section>

        {parent.length === 0 && (
          <Section title="Kategoriler">
            <EntityPicker type="category" label="Kategori" multi value={categories} onChange={setCategories} placeholder="Örn. Roman, Tarih…" />
          </Section>
        )}

        <Section title="Açıklama">
          <Field label="Kitap hakkında (opsiyonel)" value={content} onChangeText={setContent} placeholder="Kısa bir tanıtım yazısı…" multiline numberOfLines={5} style={{ minHeight: 120 }} />
        </Section>
      </ScrollView>

      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="caption" muted numberOfLines={2}>
            {missing.length ? `Eksik: ${missing.join(", ")}` : "Her şey hazır ✓"}
          </ThemedText>
        </View>
        <Pressable
          onPress={onSubmit}
          disabled={saving}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 18, borderRadius: radius.lg, backgroundColor: missing.length ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <BookPlusIcon size={18} color="#fff" />}
          <ThemedText variant="bodySemibold" color="#fff">Kitabı Gönder</ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
