import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { getCart, checkoutCart, type CartSellerGroup } from "@/api/store";

export default function SepetimScreen() {
  const { colors, spacing, radius } = useTheme();
  const [groups, setGroups] = useState<CartSellerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOutSeller, setCheckingOutSeller] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getCart();
    if (!ignore?.current) setGroups(result.groups);
  }, []);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load]);

  async function onCheckout(group: CartSellerGroup) {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Alert.alert("Eksik bilgi", "Teslimat bilgilerini doldur.");
      return;
    }
    setCheckingOutSeller(group.sellerId);
    try {
      const result = await checkoutCart(group.items.map((i) => i.id), { name, phone, address, city });
      if (result.paymentPageUrl) {
        await WebBrowser.openBrowserAsync(result.paymentPageUrl);
        await load();
      } else {
        Alert.alert("Bilgi", "Ödeme sayfası oluşturulamadı.");
      }
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Ödeme başlatılamadı.");
    } finally {
      setCheckingOutSeller(null);
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      {groups.length === 0 ? (
        <ThemedText variant="body" muted>Sepetin boş.</ThemedText>
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <TextField label="Ad Soyad" value={name} onChangeText={setName} />
            <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextField label="Adres" value={address} onChangeText={setAddress} multiline style={{ height: 70 }} />
            <TextField label="Şehir" value={city} onChangeText={setCity} />
          </View>

          {groups.map((group) => (
            <View key={group.sellerId} style={{ gap: spacing.sm, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, padding: spacing.md }}>
              <ThemedText variant="label" color={colors.textMuted}>@{group.sellerUsername}</ThemedText>
              {group.items.map((item) => (
                <View key={item.id} style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                  {item.image && <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 6 }} />}
                  <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText variant="caption">{item.price.toLocaleString("tr-TR")} ₺</ThemedText>
                </View>
              ))}
              <ThemedText variant="bodySemibold" color={colors.accent}>
                Toplam: {group.total.toLocaleString("tr-TR")} ₺ (kargo {group.shippingTotal.toLocaleString("tr-TR")} ₺ dahil)
              </ThemedText>
              <Button
                title={checkingOutSeller === group.sellerId ? "Yönlendiriliyor…" : "Bu Satıcıyı Öde"}
                onPress={() => onCheckout(group)}
                disabled={checkingOutSeller !== null}
                block
              />
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
