import { useState } from "react";
import { View, ScrollView, Pressable, Image, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { XIcon, PlusIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { createListing } from "@/api/store";

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
      });
      router.replace({ pathname: "/askida-kitap/[slug]", params: { slug: result.slug } });
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "İlan oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
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
  );
}
