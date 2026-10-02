import { useEffect, useRef, useState } from "react";
import { View, Pressable, TextInput, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { XIcon, ImageIcon, BookIcon, ScanBarcodeIcon, CameraIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { createFeedPost } from "@/api/feed";
import { search, type SearchResultBook } from "@/api/search";
import { markFeedDirty } from "@/lib/feedRefresh";

const MAX = 2000;

export default function GonderiYeniScreen() {
  const { colors, spacing, radius, fontFamily } = useTheme();
  const { profile } = useAuth();
  const { action } = useLocalSearchParams<{ action?: "photo" | "book" | "camera" }>();
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [book, setBook] = useState<SearchResultBook | null>(null);
  const [pickerOpen, setPickerOpen] = useState(action === "book");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResultBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const seq = useRef(0);
  const firstName = profile?.name?.split(" ")[0] ?? profile?.username ?? "";

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", fromCamera ? "Fotoğraf çekmek için kamera izni vermelisin." : "Fotoğraf seçmek için galeri izni vermelisin.");
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, allowsEditing: true };
    const result = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setImage({ uri: a.uri, name: a.fileName ?? `feed-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
  }

  // Opens the picker straight away when arriving from Akış's "Fotoğraf"
  // shortcut; state is only set after the user picks, asynchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (action === "photo") pickImage(false);
    if (action === "camera") pickImage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onQuery(v: string) {
    setQ(v);
    const s = ++seq.current;
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await search(v);
      if (s === seq.current) setResults(r.books.slice(0, 8));
    } finally {
      if (s === seq.current) setSearching(false);
    }
  }

  const canPost = (text.trim().length > 0 || image || book) && !posting;

  async function onPost() {
    if (!canPost) return;
    setPosting(true);
    try {
      await createFeedPost({ text: text.trim(), image, bookId: book?.id ?? null });
      markFeedDirty();
      router.back();
    } catch (err) {
      Alert.alert("Paylaşılamadı", err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setPosting(false);
    }
  }

  function close() {
    if (text.trim() || image || book) {
      Alert.alert("Gönderi silinsin mi?", "Yazdıkların kaybolacak.", [
        { text: "Düzenlemeye devam et", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: () => router.back() },
      ]);
    } else router.back();
  }

  if (!profile) return null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.card }}>
      <KeyboardScreen offset="safeTop">
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
          <Pressable onPress={close} hitSlop={10} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
            <XIcon size={24} color={colors.text} />
          </Pressable>
          <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>Gönderi oluştur</ThemedText>
          <Pressable
            onPress={onPost}
            disabled={!canPost}
            style={({ pressed }) => ({ height: 36, paddingHorizontal: 18, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: !canPost ? colors.neutral200 : pressed ? colors.accent700 : colors.accent })}
          >
            {posting ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText variant="bodySemibold" color={canPost ? "#fff" : colors.neutral500}>Paylaş</ThemedText>}
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg }}>
            <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={46} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
            <View>
              <ThemedText variant="bodySemibold" style={{ fontSize: 16 }}>{[profile.name, profile.surname].filter(Boolean).join(" ") || profile.username}</ThemedText>
              <View style={{ alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.neutral200, marginTop: 2 }}>
                <ThemedText variant="caption" style={{ fontSize: 11 }}>Herkese açık · Akış</ThemedText>
              </View>
            </View>
          </View>

          <TextInput
            value={text}
            onChangeText={(v) => setText(v.slice(0, MAX))}
            placeholder={book ? `“${book.name}” hakkında ne düşünüyorsun?` : `Ne okuyorsun, ${firstName}?`}
            placeholderTextColor={colors.neutral500}
            multiline
            autoFocus={!action}
            style={{
              minHeight: 140,
              paddingHorizontal: spacing.lg,
              fontSize: text.length < 90 && !image ? 18 : 16,
              lineHeight: text.length < 90 && !image ? 26 : 23,
              fontFamily: fontFamily.bodyRegular,
              color: colors.text,
              textAlignVertical: "top",
            }}
          />

          {image && (
            <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}>
              <Image source={{ uri: image.uri }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surface }} resizeMode="cover" />
              <Pressable onPress={() => setImage(null)} hitSlop={8} style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                <XIcon size={18} color="#fff" />
              </Pressable>
            </View>
          )}

          {book && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.neutral100, borderWidth: 1, borderColor: colors.divider }}>
              <BookCover id={book.id} title={book.name} width={48} height={70} hasImage={book.hasImage} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="label" color={colors.accent} style={{ fontSize: 10 }}>Etiketlenen kitap</ThemedText>
                <ThemedText variant="title" numberOfLines={2}>{book.name}</ThemedText>
                <ThemedText variant="caption" muted numberOfLines={1}>{book.writers.join(", ")}</ThemedText>
              </View>
              <Pressable onPress={() => setBook(null)} hitSlop={8} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral300, alignItems: "center", justifyContent: "center" }}>
                <XIcon size={14} color={colors.text} />
              </Pressable>
            </View>
          )}

          {pickerOpen && (
            <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.xs }}>
              <SearchBar value={q} onChangeText={onQuery} placeholder="Etiketlemek için kitap ara…" autoFocus />
              {searching && <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.sm }} />}
              {results.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    setBook(b);
                    setPickerOpen(false);
                    setQ("");
                    setResults([]);
                  }}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
                >
                  <BookCover id={b.id} title={b.name} width={34} height={50} hasImage={b.hasImage} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySemibold" numberOfLines={1}>{b.name}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
                  </View>
                  <ChevronRightIcon size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ThemedText variant="bodySemibold" style={{ flex: 1, paddingLeft: 4 }}>Gönderine ekle</ThemedText>
            <ThemedText variant="caption" muted>{text.length}/{MAX}</ThemedText>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: 4 }}>
            {[
              { key: "photo", label: "Fotoğraf", Icon: ImageIcon, tint: "#3f8a5a", onPress: () => pickImage(false), on: Boolean(image) },
              { key: "camera", label: "Kamera", Icon: CameraIcon, tint: "#2f5d8a", onPress: () => pickImage(true), on: false },
              { key: "book", label: "Kitap", Icon: BookIcon, tint: colors.accent, onPress: () => setPickerOpen((v) => !v), on: pickerOpen || Boolean(book) },
              { key: "scan", label: "Barkod", Icon: ScanBarcodeIcon, tint: "#7d5411", onPress: () => router.push("/barkod"), on: false },
            ].map((b) => (
              <Pressable
                key={b.key}
                onPress={b.onPress}
                style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 3, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: b.on ? `${b.tint}1F` : pressed ? colors.neutral200 : "transparent" })}
              >
                <b.Icon size={22} color={b.tint} />
                <ThemedText variant="caption" style={{ fontSize: 11.5 }}>{b.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardScreen>
    </SafeAreaView>
  );
}
