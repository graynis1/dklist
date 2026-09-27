import { useEffect, useState } from "react";
import { View, ScrollView, Pressable, TextInput, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImagePlusIcon, XIcon, CheckCircle2Icon, InfoIcon, RefreshCwIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { createBlog } from "@/api/content";
import { markBlogDirty } from "@/lib/blogRefresh";

export default function BlogYeniScreen() {
  const { colors, spacing, radius, fontFamily } = useTheme();
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const missing = [!image && "kapak görseli", !title.trim() && "başlık", !preview.trim() && "özet", content.trim().length < 50 && "içerik (en az 50 karakter)"].filter(Boolean) as string[];
  const ready = missing.length === 0;

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("İzin gerekli", "Kapak görseli seçmek için galeri izni vermelisin.");
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: true, aspect: [16, 10] });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setImage({ uri: a.uri, name: a.fileName ?? `blog-${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" });
  }

  async function submit() {
    if (!ready || !image) {
      Alert.alert("Eksik bilgi", `Lütfen tamamla: ${missing.join(", ")}.`);
      return;
    }
    setSaving(true);
    try {
      await createBlog({ title: title.trim(), preview: preview.trim(), content: content.trim(), image });
      markBlogDirty();
      setDone(true);
    } catch (err) {
      Alert.alert("Gönderilemedi", err instanceof Error ? err.message : "Blog yazısı kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    navigation.setOptions({
      title: "Yeni Yazı",
      headerRight: done
        ? undefined
        : () => (
            <Pressable
              onPress={submit}
              disabled={saving}
              style={({ pressed }) => ({ height: 34, paddingHorizontal: 16, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: !ready ? colors.neutral300 : pressed ? colors.accent700 : colors.accent })}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText variant="bodySemibold" color="#fff">Gönder</ThemedText>}
            </Pressable>
          ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, ready, saving, done, title, preview, content, image]);

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState
          icon={<CheckCircle2Icon size={32} color={colors.accent} />}
          title="Yazın onaya gönderildi"
          subtitle="Editörlerimiz inceledikten sonra Bloglar bölümünde yayınlanacak. Teşekkürler!"
          actionLabel="Bloglara Dön"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const bare = { fontFamily: fontFamily.bodyRegular, color: colors.text, paddingHorizontal: 0 };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.card }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing["3xl"] }}>
        {image ? (
          <View>
            <Image source={{ uri: image.uri }} style={{ width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.surface }} resizeMode="cover" />
            <View style={{ position: "absolute", top: spacing.sm, right: spacing.sm, flexDirection: "row", gap: spacing.xs }}>
              <Pressable onPress={pickImage} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                <RefreshCwIcon size={17} color="#fff" />
              </Pressable>
              <Pressable onPress={() => setImage(null)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }}>
                <XIcon size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => ({ margin: spacing.lg, aspectRatio: 16 / 9, borderRadius: radius.xl, borderWidth: 2, borderStyle: "dashed", borderColor: colors.accent300, backgroundColor: pressed ? colors.accent200 : colors.accent100, alignItems: "center", justifyContent: "center", gap: spacing.sm })}
          >
            <ImagePlusIcon size={36} color={colors.accent} />
            <ThemedText variant="title" color={colors.accent800}>Kapak görseli ekle</ThemedText>
            <ThemedText variant="caption" color={colors.accent700}>Zorunlu · yatay (16:10) görseller en iyi sonucu verir</ThemedText>
          </Pressable>
        )}

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Başlık"
            placeholderTextColor={colors.neutral400}
            multiline
            maxLength={200}
            style={{ ...bare, fontFamily: fontFamily.headingSemibold, fontSize: 30, lineHeight: 36 }}
          />
          <TextInput
            value={preview}
            onChangeText={setPreview}
            placeholder="Kısa bir özet — listede başlığın altında görünür"
            placeholderTextColor={colors.neutral400}
            multiline
            maxLength={300}
            style={{ ...bare, fontFamily: fontFamily.headingSemiboldItalic, fontSize: 18, lineHeight: 25, color: colors.textMuted }}
          />
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={"Yazına başla…\n\nParagrafları ayırmak için bir satır boş bırak."}
            placeholderTextColor={colors.neutral400}
            multiline
            style={{ ...bare, fontSize: 17, lineHeight: 27, minHeight: 280, textAlignVertical: "top" }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.neutral100 }}>
          <InfoIcon size={17} color={colors.textMuted} />
          <ThemedText variant="caption" muted style={{ flex: 1, lineHeight: 18 }}>
            {ready
              ? `Hazır · ${content.trim().split(/\s+/).length} kelime. Yazın editör onayından sonra yayınlanır.`
              : `Eksik: ${missing.join(", ")}.`}
          </ThemedText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
