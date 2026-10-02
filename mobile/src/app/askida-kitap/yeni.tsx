import { useRef, useState } from "react";
import { View, ScrollView, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { XIcon, PlusIcon, BookOpenIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { createListing } from "@/api/store";
import { search, type SearchResultBook } from "@/api/search";
import { SearchBar } from "@/components/SearchBar";
import { BookCover } from "@/components/BookCover";
import { KeyboardScreen } from "@/components/KeyboardScreen";

interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

const MAX_IMAGES = 6;

export default function YeniIlanScreen() {
  const { colors, spacing, radius } = useTheme();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [shipment, setShipment] = useState("");
  const [listingType, setListingType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Optional link to the catalog book (web parity) - shows the listing on that
  // book page and notifies readers who have it on their "okuyacağım" shelf.
  const [book, setBook] = useState<SearchResultBook | null>(null);
  const [bookQuery, setBookQuery] = useState("");
  const [bookResults, setBookResults] = useState<SearchResultBook[]>([]);
  const seq = useRef(0);

  async function onBookQuery(q: string) {
    setBookQuery(q);
    const mySeq = ++seq.current;
    if (q.trim().length < 2) return setBookResults([]);
    try {
      const r = await search(q);
      if (mySeq === seq.current) setBookResults(r.books.slice(0, 6));
    } catch {
      // optional field
    }
  }

  function pickBook(b: SearchResultBook) {
    setBook(b);
    setBookQuery("");
    setBookResults([]);
    if (!title.trim()) setTitle(b.name);
  }

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Fotoğraf eklemek için galeri izni vermelisin.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    const picked = result.assets.map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName ?? `foto-${Date.now()}-${i}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  }

  async function onSubmit() {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Eksik bilgi", "Başlık ve açıklama gerekli.");
      return;
    }
    if (images.length === 0) {
      Alert.alert("Eksik bilgi", "En az bir fotoğraf eklemelisin.");
      return;
    }
    if (listingType === "paid" && (!price.trim() || Number(price) <= 0)) {
      Alert.alert("Eksik bilgi", "Ücretli ilan için geçerli bir fiyat gir.");
      return;
    }
    if (listingType === "paid" && (!stock.trim() || Number(stock) <= 0)) {
      Alert.alert("Eksik bilgi", "Ücretli ilan için geçerli bir stok adedi gir.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createListing({
        title: title.trim(),
        content: content.trim(),
        location: location.trim(),
        shipment: shipment.trim(),
        images,
        listingType,
        price: listingType === "paid" ? Number(price) : undefined,
        stock: listingType === "paid" ? Number(stock) : undefined,
        shippingFee: listingType === "paid" && shippingFee.trim() ? Number(shippingFee) : undefined,
        bookId: book?.id,
      });
      router.replace({ pathname: "/askida-kitap/[slug]", params: { slug: result.slug } });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İlan oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardScreen style={{ backgroundColor: colors.bg }}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Fotoğraflar</ThemedText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {images.map((img) => (
            <View key={img.uri} style={{ width: 80, height: 80 }}>
              <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: radius.md }} resizeMode="cover" />
              <Pressable
                onPress={() => removeImage(img.uri)}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: colors.bg,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  padding: 3,
                }}
              >
                <XIcon size={14} color={colors.text} />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES && (
            <Pressable
              onPress={pickImages}
              style={{
                width: 80,
                height: 80,
                borderRadius: radius.md,
                borderWidth: 1.5,
                borderColor: colors.divider,
                borderStyle: "dashed",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PlusIcon size={22} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Katalogdaki kitap (opsiyonel)</ThemedText>
        {book ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accent100 }}>
            <BookCover id={book.id} title={book.name} width={36} height={52} hasImage={book.hasImage} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodySemibold" numberOfLines={2}>{book.name}</ThemedText>
              <ThemedText variant="caption" muted numberOfLines={1}>{book.writers.join(", ")}</ThemedText>
            </View>
            <Pressable onPress={() => setBook(null)} hitSlop={8}>
              <XIcon size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <>
            <SearchBar value={bookQuery} onChangeText={onBookQuery} placeholder="Kitap adı veya yazar ara" />
            {bookResults.map((b) => (
              <Pressable key={b.id} onPress={() => pickBook(b)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 6, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                <BookCover id={b.id} title={b.name} width={30} height={44} hasImage={b.hasImage} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySemibold" numberOfLines={1}>{b.name}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
                </View>
                <BookOpenIcon size={16} color={colors.accent} />
              </Pressable>
            ))}
            <ThemedText variant="caption" muted>Kitabı seçersen ilanın o kitabın sayfasında görünür ve okumak isteyenlere bildirim gider.</ThemedText>
          </>
        )}
      </View>

      <TextField label="Başlık" value={title} onChangeText={setTitle} placeholder="Örn: Suç ve Ceza - İyi durumda" />
      <TextField label="Açıklama" value={content} onChangeText={setContent} multiline style={{ height: 90 }} />
      <TextField label="Konum (opsiyonel)" value={location} onChangeText={setLocation} placeholder="Örn: Kadıköy, İstanbul" />
      <TextField label="Kargo notu (opsiyonel)" value={shipment} onChangeText={setShipment} placeholder="Örn: Kargo alıcıya ait" />

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>İlan Türü</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {(["free", "paid"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setListingType(t)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: listingType === t ? colors.accent : colors.divider,
              }}
            >
              <ThemedText variant="caption" color={listingType === t ? colors.accent : colors.text}>
                {t === "free" ? "Ücretsiz (Askıda)" : "Satılık"}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {listingType === "paid" && (
        <View style={{ gap: spacing.sm }}>
          <TextField label="Fiyat (₺)" value={price} onChangeText={setPrice} keyboardType="numeric" />
          <TextField label="Stok Adedi" value={stock} onChangeText={setStock} keyboardType="numeric" />
          <TextField label="Kargo Ücreti (₺, boş = kargo dahil)" value={shippingFee} onChangeText={setShippingFee} keyboardType="numeric" />
        </View>
      )}

      <Button
        title={submitting ? "Yayınlanıyor…" : "İlanı Yayınla"}
        onPress={onSubmit}
        disabled={submitting}
        block
      />
      {submitting && <ActivityIndicator color={colors.accent} />}
    </ScrollView>
    </KeyboardScreen>
  );
}
