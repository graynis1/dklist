import { useRef, useState } from "react";
import { View, FlatList, Pressable, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, Users, Sparkles, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useOnboarding } from "@/auth/OnboardingContext";
import { router } from "expo-router";

const SLIDES = [
  {
    icon: BookOpen,
    title: "Okuduklarını Kayıt Altına Al",
    description: "Kitaplığını oluştur, puanla, yorum yap ve okuma hedeflerini takip et.",
  },
  {
    icon: Sparkles,
    title: "Yeni Kitaplar Keşfet",
    description: "Binlerce kitap, yazar ve çevirmen arasından sana göre önerileri bul.",
  },
  {
    icon: Users,
    title: "Okurlarla Buluş",
    description: "Kulüplere katıl, akışta paylaş, aynı rafı paylaştığın okurları takip et.",
  },
  {
    icon: MessageCircle,
    title: "Kitap Al, Sat, Sohbet Et",
    description: "Askıda Kitap'ta ilan ver veya bul, diğer okurlarla doğrudan mesajlaş.",
  },
] as const;

export default function OnboardingScreen() {
  const { colors, spacing } = useTheme();
  const { markSeen } = useOnboarding();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  function finish(to?: "kayit-ol") {
    // markSeen() flips OnboardingContext's own state and Stack.Protected
    // steers to (auth) (the login screen) automatically. "Üye Ol" then
    // pushes the sign-up screen on top once that group is mounted.
    void markSeen().then(() => {
      if (to) setTimeout(() => router.push("/kayit-ol"), 50);
    });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  function next() {
    if (index === SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (index + 1) * width, animated: true });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ alignItems: "flex-end", paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Pressable onPress={() => finish()} hitSlop={8}>
          <ThemedText variant="caption" muted>
            Geç
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing["2xl"], gap: spacing.xl }}>
            <LinearGradient
              colors={[colors.accent300, colors.accent700]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={{ width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" }}
            >
              <item.icon color="#fff" size={52} strokeWidth={1.75} />
            </LinearGradient>
            <View style={{ gap: spacing.sm, alignItems: "center" }}>
              <ThemedText variant="headline" style={{ textAlign: "center" }}>
                {item.title}
              </ThemedText>
              <ThemedText variant="body" muted style={{ textAlign: "center" }}>
                {item.description}
              </ThemedText>
            </View>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: spacing["2xl"], paddingBottom: spacing.lg, gap: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={{
                width: i === index ? 20 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === index ? colors.accent : colors.divider,
              }}
            />
          ))}
        </View>
        {index === SLIDES.length - 1 ? (
          <View style={{ gap: spacing.sm }}>
            <Button title="Üye Ol" onPress={() => finish("kayit-ol")} block />
            <Button title="Giriş Yap" variant="secondary" onPress={() => finish()} block />
          </View>
        ) : (
          <Button title="İleri" onPress={next} block />
        )}
      </View>
    </SafeAreaView>
  );
}
