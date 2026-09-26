import { useState } from "react";
import { View, ScrollView, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { createClub } from "@/api/clubs";
import { search, type SearchResultBook } from "@/api/search";

export default function YeniKulupScreen() {
  const { colors, spacing, radius } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);
  const [currentBook, setCurrentBook] = useState<SearchResultBook | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onBookQueryChange(q: string) {
    setBookQuery(q);
    if (q.trim().length < 2) {
      setBookResults([]);
      return;
    }
    const result = await search(q);
    setBookResults(result.books.slice(0, 5));
  }

  function onSelectBook(book: SearchResultBook) {
    setCurrentBook(book);
    setBookQuery("");
    setBookResults([]);
  }

  async function onSubmit() {
    if (name.trim().length < 3) {
      Alert.alert("Eksik bilgi", "Kulüp adı en az 3 karakter olmalı.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Eksik bilgi", "Kulüp açıklaması zorunlu.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createClub({
        name: name.trim(),
        description: description.trim(),
        visibility,
        currentBookId: currentBook?.id ?? null,
      });
      router.replace({ pathname: "/kulup/[slug]", params: { slug: result.slug } });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Kulüp oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <TextField label="Kulüp Adı" value={name} onChangeText={setName} placeholder="Örn. Sabahattin Ali okurları" />
      <TextField label="Açıklama" value={description} onChangeText={setDescription} multiline style={{ height: 90, textAlignVertical: "top", paddingTop: 10 }} />

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Görünürlük</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {(["public", "private"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVisibility(v)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: visibility === v ? colors.accent : colors.divider,
              }}
            >
              <ThemedText variant="caption" color={visibility === v ? colors.accent : colors.text}>
                {v === "public" ? "Herkese Açık" : "Gizli"}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Şu An Okunan Kitap (opsiyonel)</ThemedText>
        {currentBook ? (
          <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
            <BookCover id={currentBook.id} title={currentBook.name} width={40} height={58} hasImage={currentBook.hasImage} />
            <ThemedText variant="body" style={{ flex: 1 }}>{currentBook.name}</ThemedText>
            <Pressable onPress={() => setCurrentBook(null)} hitSlop={8}>
              <ThemedText variant="caption" color={colors.accent}>Kaldır</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <TextField label="" value={bookQuery} onChangeText={onBookQueryChange} placeholder="Kitap ara…" />
            {bookResults.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => onSelectBook(b)}
                style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", paddingVertical: spacing.xs, borderRadius: radius.md }}
              >
                <BookCover id={b.id} title={b.name} width={32} height={46} hasImage={b.hasImage} />
                <ThemedText variant="body">{b.name}</ThemedText>
              </Pressable>
            ))}
          </>
        )}
      </View>

      <Button title={submitting ? "Oluşturuluyor…" : "Kulübü Oluştur"} onPress={onSubmit} disabled={submitting} block />
    </ScrollView>
  );
}
