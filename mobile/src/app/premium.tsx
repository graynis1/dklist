import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getPremiumStatus, startPremiumCheckout, type PremiumSettings } from "@/api/premium";

/**
 * Purchase hands off to İyzico's own hosted checkout page in an in-app
 * browser sheet (`expo-web-browser`, a real native modal presentation,
 * not an embedded WebView screen) rather than collecting card details
 * natively - this app never touches raw card data, same boundary the web
 * checkout already relies on. Returns to this screen after the browser
 * sheet closes and re-checks status, since İyzico's own callback finishes
 * the purchase server-side independently of whether the user is still
 * watching.
 */
export default function PremiumScreen() {
  const { colors, spacing } = useTheme();
  const [settings, setSettings] = useState<PremiumSettings | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getPremiumStatus();
    if (!ignore?.current) {
      setSettings(result.settings);
      setIsPremium(result.isPremium);
      setExpiresAt(result.expiresAt);
    }
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

  async function onPurchase() {
    setPurchasing(true);
    try {
      const result = await startPremiumCheckout();
      if (result.paymentPageUrl) {
        await WebBrowser.openBrowserAsync(result.paymentPageUrl);
        await load();
      } else {
        Alert.alert("Bilgi", "Ödeme sayfası oluşturulamadı.");
      }
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Ödeme başlatılamadı.");
    } finally {
      setPurchasing(false);
    }
  }

  if (loading || !settings) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.lg }}>
      <ThemedText variant="headline">DKList Premium</ThemedText>

      {isPremium ? (
        <View style={{ gap: spacing.xs }}>
          <ThemedText variant="body" color={colors.accent700}>Premium üyeliğin aktif ✓</ThemedText>
          {expiresAt && <ThemedText variant="caption" muted>Bitiş: {new Date(expiresAt).toLocaleDateString("tr-TR")}</ThemedText>}
        </View>
      ) : settings.active ? (
        <View style={{ gap: spacing.md }}>
          <ThemedText variant="body">
            {(settings.priceKurus / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })} · {settings.durationDays} gün
          </ThemedText>
          <Button title={purchasing ? "Yönlendiriliyor…" : "Satın Al"} onPress={onPurchase} disabled={purchasing} block />
        </View>
      ) : (
        <ThemedText variant="body" muted>Premium üyelik şu anda satışa kapalı.</ThemedText>
      )}
    </View>
  );
}
