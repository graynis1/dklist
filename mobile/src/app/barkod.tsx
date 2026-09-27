import { useEffect, useRef, useState } from "react";
import { View, Pressable, ActivityIndicator, Animated, Easing, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { XIcon, FlashlightIcon, FlashlightOffIcon, KeyboardIcon, ScanLineIcon, BookPlusIcon, RotateCcwIcon, SearchIcon, ChevronRightIcon, CameraOffIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { lookupIsbn, getSubmitMeta, type IsbnLookup } from "@/api/contribute";

const FRAME_W = 280;
const FRAME_H = 170;

function Corner({ style }: { style: object }) {
  return <View style={[{ position: "absolute", width: 34, height: 34, borderColor: "#fff" }, style]} />;
}

export default function BarkodScreen() {
  const { colors, spacing, radius, fontFamily } = useTheme();
  const { fill } = useLocalSearchParams<{ fill?: string }>();
  const fillMode = fill === "1";
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IsbnLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const lastCode = useRef<string | null>(null);
  const [line] = useState(() => new Animated.Value(0));

  useEffect(() => {
    getSubmitMeta()
      .then((m) => setCanSubmit(m.canSubmit))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [line]);

  async function resolve(code: string) {
    setScanning(false);
    setManualOpen(false);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const r = await lookupIsbn(code);
      if (fillMode) {
        router.dismissTo({
          pathname: "/kitap/yeni",
          params: { isbn: r.isbn, name: r.info?.title ?? "", pages: r.info?.pages ? String(r.info.pages) : "" },
        });
        return;
      }
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barkod okunamadı.");
    } finally {
      setLoading(false);
    }
  }

  function onScanned(e: BarcodeScanningResult) {
    if (!scanning || e.data === lastCode.current) return;
    const digits = e.data.replace(/[^0-9Xx]/g, "");
    if (digits.length !== 13 && digits.length !== 10) return;
    lastCode.current = e.data;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    resolve(digits);
  }

  function reset() {
    lastCode.current = null;
    setResult(null);
    setError(null);
    setScanning(true);
  }

  const translateY = line.interpolate({ inputRange: [0, 1], outputRange: [8, FRAME_H - 10] });
  const sheetOpen = loading || result || error;

  const openAddBook = (prefill: { isbn?: string; name?: string; pages?: string }) =>
    router.push({ pathname: "/kitap/yeni", params: prefill });

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
          onBarcodeScanned={scanning ? onScanned : undefined}
        />
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.roundBtn}>
            <XIcon size={22} color="#fff" />
          </Pressable>
          <ThemedText variant="title" color="#fff" style={{ flex: 1, textAlign: "center", fontSize: 18 }}>
            {fillMode ? "ISBN Tara" : "Barkodla Kitap Bul"}
          </ThemedText>
          <Pressable onPress={() => setTorch((t) => !t)} hitSlop={10} style={[styles.roundBtn, torch && { backgroundColor: colors.accent }]} disabled={!permission?.granted}>
            {torch ? <FlashlightIcon size={20} color="#fff" /> : <FlashlightOffIcon size={20} color="#fff" />}
          </Pressable>
        </View>

        {permission && !permission.granted ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.md }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
              <CameraOffIcon size={34} color="#fff" />
            </View>
            <ThemedText variant="headline" color="#fff" style={{ textAlign: "center" }}>Kamera izni gerekli</ThemedText>
            <ThemedText variant="body" color="rgba(255,255,255,0.75)" style={{ textAlign: "center" }}>
              Kitabın arka kapağındaki barkodu okuyabilmek için kameraya erişmemiz gerekiyor. Dilersen ISBN numarasını elle de girebilirsin.
            </ThemedText>
            {permission.canAskAgain && <Button title="Kameraya İzin Ver" onPress={requestPermission} style={{ alignSelf: "center" }} />}
            <Pressable onPress={() => setManualOpen(true)}>
              <ThemedText variant="bodySemibold" color={colors.accent300}>ISBN&apos;i elle gir</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: FRAME_W, height: FRAME_H }}>
              <Corner style={{ top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }} />
              <Corner style={{ top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 }} />
              <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 }} />
              <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 }} />
              {scanning && (
                <Animated.View style={{ position: "absolute", left: 14, right: 14, height: 2, borderRadius: 1, backgroundColor: colors.accent400, transform: [{ translateY }], shadowColor: colors.accent400, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 }} />
              )}
            </View>
            <View style={{ marginTop: spacing.xl, paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: "rgba(0,0,0,0.55)", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ScanLineIcon size={16} color="#fff" />
              <ThemedText variant="caption" color="#fff" style={{ fontSize: 13 }}>
                Arka kapaktaki ISBN barkodunu çerçeveye hizala
              </ThemedText>
            </View>
          </View>
        )}

        {!sheetOpen && permission?.granted && (
          <View style={{ alignItems: "center", paddingBottom: spacing.xl }}>
            <Pressable
              onPress={() => setManualOpen(true)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: pressed ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.18)" })}
            >
              <KeyboardIcon size={18} color="#fff" />
              <ThemedText variant="bodySemibold" color="#fff">ISBN&apos;i elle gir</ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {manualOpen && !sheetOpen && (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>ISBN numarası</ThemedText>
              <Pressable onPress={() => setManualOpen(false)} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
                <XIcon size={16} color={colors.text} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 50, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.accent, paddingHorizontal: 14 }}>
              <SearchIcon size={18} color={colors.textMuted} />
              <TextInput
                value={manualIsbn}
                onChangeText={(t) => setManualIsbn(t.replace(/[^0-9Xx-]/g, ""))}
                placeholder="978-975-470-011-4"
                placeholderTextColor={colors.neutral500}
                keyboardType="number-pad"
                autoFocus
                maxLength={17}
                onSubmitEditing={() => manualIsbn.replace(/-/g, "").length >= 10 && resolve(manualIsbn)}
                style={{ flex: 1, fontSize: 18, letterSpacing: 1, fontFamily: fontFamily.bodySemibold, color: colors.text }}
              />
            </View>
            <ThemedText variant="caption" muted>10 veya 13 haneli ISBN numarası kitabın arka kapağında ya da künye sayfasında yazar.</ThemedText>
            <Button title="Kitabı Bul" block onPress={() => resolve(manualIsbn)} disabled={manualIsbn.replace(/[^0-9Xx]/g, "").length < 10} />
          </View>
        </KeyboardAvoidingView>
      )}

      {sheetOpen && (
        <View style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: colors.card, maxHeight: "72%" }]}>
            <View style={{ alignItems: "center", paddingTop: 8 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral300 }} />
            </View>
            {loading ? (
              <View style={{ alignItems: "center", padding: spacing["2xl"], gap: spacing.md }}>
                <ActivityIndicator color={colors.accent} size="large" />
                <ThemedText variant="body" muted>Kitap aranıyor…</ThemedText>
              </View>
            ) : error ? (
              <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: "center" }}>
                <ThemedText variant="headline" style={{ textAlign: "center" }}>Okunamadı</ThemedText>
                <ThemedText variant="body" muted style={{ textAlign: "center" }}>{error}</ThemedText>
                <Button title="Tekrar Tara" onPress={reset} style={{ alignSelf: "center" }} />
              </View>
            ) : result ? (
              <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                    <ScanLineIcon size={24} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="caption" muted>ISBN {result.isbn}</ThemedText>
                    <ThemedText variant="title" style={{ fontSize: 18 }} numberOfLines={2}>
                      {result.info?.title ?? "Kayıtlı bilgi bulunamadı"}
                    </ThemedText>
                    {result.info && (
                      <ThemedText variant="caption" muted numberOfLines={1}>
                        {[result.info.authors.join(", "), result.info.publisher, result.info.pages ? `${result.info.pages} sayfa` : null].filter(Boolean).join(" · ")}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {result.matches.length > 0 ? (
                  <>
                    <ThemedText variant="label" color={colors.textMuted}>DKList&apos;te eşleşen kitaplar</ThemedText>
                    {result.matches.map((b) => (
                      <Pressable
                        key={b.id}
                        onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })}
                        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.neutral100 : colors.card })}
                      >
                        <BookCover id={b.id} title={b.name} width={40} height={58} hasImage={b.hasImage} />
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="bodySemibold" numberOfLines={2}>{b.name}</ThemedText>
                          <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ")}</ThemedText>
                        </View>
                        <ChevronRightIcon size={18} color={colors.textMuted} />
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <ThemedText variant="body" muted>
                    {result.info ? "Bu kitap henüz DKList kataloğunda yok." : "Bu barkoda ait kitap bilgisine ulaşılamadı."}
                  </ThemedText>
                )}

                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                  <Pressable onPress={reset} style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
                    <RotateCcwIcon size={17} color={colors.text} />
                    <ThemedText variant="bodySemibold">Yeniden Tara</ThemedText>
                  </Pressable>
                  {canSubmit && (
                    <Pressable
                      onPress={() => openAddBook({ isbn: result.isbn, name: result.info?.title ?? "", pages: result.info?.pages ? String(result.info.pages) : "" })}
                      style={({ pressed }) => ({ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 46, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent700 : colors.accent })}
                    >
                      <BookPlusIcon size={17} color="#fff" />
                      <ThemedText variant="bodySemibold" color="#fff">Kitap Ekle</ThemedText>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
});
