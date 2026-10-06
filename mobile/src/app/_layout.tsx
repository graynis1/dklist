import { useEffect } from "react";
import { View, ActivityIndicator, useColorScheme, Platform } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import {
  useFonts as useCormorantFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { useFonts as useLoraFonts, Lora_400Regular, Lora_400Regular_Italic, Lora_600SemiBold } from "@expo-google-fonts/lora";
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { OnboardingProvider, useOnboarding } from "@/auth/OnboardingContext";
import { BottomTabBar } from "@/components/BottomTabBar";
import { ActionSheetHost } from "@/components/ActionSheet";
import { setupNotificationChannel } from "@/api/pushNotifications";
import { palette } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});
void setupNotificationChannel();

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;

  const [cormorantLoaded] = useCormorantFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
  });
  const [loraLoaded] = useLoraFonts({ Lora_400Regular, Lora_400Regular_Italic, Lora_600SemiBold });
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const fontsReady = cormorantLoaded && loraLoaded && interLoaded;

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  // Modern edge-to-edge Android no longer lets an app paint the system nav
  // bar's background (a real platform change, not a missed API) - only its
  // button/icon contrast is still settable, so this just keeps that
  // legible against whichever theme is active.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setStyle(scheme === "dark" ? "light" : "dark");
  }, [scheme]);

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <OnboardingProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <RootNavigator />
        </OnboardingProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

/**
 * `Stack.Protected` (expo-router's own documented auth-flow primitive,
 * not a hand-rolled redirect) - a screen inside a `guard={false}` block is
 * simply not part of the navigator, and Expo Router automatically steers
 * navigation away from it if it was active. `profile === undefined`
 * (still checking SecureStore) shows a loading view rather than flashing
 * the login screen for one frame.
 *
 * The bottom tab bar is a plain custom component (`BottomTabBar`)
 * rendered as a fixed sibling BELOW the entire `<Stack>`, not
 * expo-router's `Tabs` navigator - see that component's own doc comment
 * for why (real bug: most secondary screens lost the tab bar entirely
 * under the old `Tabs`-based setup, since they were root Stack screens
 * outside the tabs group). The 5 former tab screens are now plain root
 * Stack screens too (`headerShown: false`, matching the old Tabs'
 * screenOptions), indistinguishable from any other route except that
 * BottomTabBar treats them as its own active/highlighted destinations.
 *
 * A one-time onboarding carousel gates the auth screens the same way -
 * `hasSeenOnboarding` comes from `OnboardingContext` (SecureStore-backed,
 * same mechanism as the auth token itself - see that context's own doc
 * comment for the real bug this fixed: a local, non-reactive copy of this
 * flag never flipped the guard when onboarding finished).
 */
const HEADER_TITLE = { fontFamily: "Inter_600SemiBold", fontSize: 17 };

function RootNavigator() {
  const { profile } = useAuth();
  const { hasSeenOnboarding } = useOnboarding();
  const colors = useColorScheme() === "dark" ? palette.dark : palette.light;

  if (profile === undefined || hasSeenOnboarding === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasSeenOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={hasSeenOnboarding && !profile}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(profile)}>
        <Stack.Screen name="index" />
        <Stack.Screen name="kesfet" />
        <Stack.Screen name="kitapligim" />
        <Stack.Screen name="mesajlar" />
        <Stack.Screen name="profil" />
        {/* Detail screens reachable from more than one tab (Keşfet/
            Kitaplığım both link to a book; the Mesajlar tab's conversation
            list pushes a thread) - real Stack screens, not nested inside
            the tab navigator itself, so they get a normal push/back
            transition instead of swapping the whole tab bar away. */}
        <Stack.Screen
          name="kitap/[slug]"
          options={{
            headerShown: false,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="mesajlar/[username]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="profil/[username]"
          options={{
            headerShown: false,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="barkod" options={{ headerShown: false, animation: "slide_from_bottom" }} />
        <Stack.Screen name="gonderi-yeni" options={{ headerShown: false, animation: "slide_from_bottom" }} />
        {(
          [
            ["kitap/yeni", "Kitap Ekle"],
            ["yazarhane", "Yazarhane"],
            ["blog/yeni", "Yeni Yazı"],
            ["kitaplar", "Kitaplar"],
            ["ayin-kitabi", "Ayın Kitabı"],
            ["listeler", "Listeler"],
            ["destek", "Yardım ve Destek"],
            ["engellenenler", "Engellenenler"],
            ["kulup/yeni", "Kulüp Oluştur"],
            ["yayinevi-basvuru", "Yayınevi Başvurusu"],
            ["takip/[username]", ""],
            ["yazarhane/[username]", ""],
          ] as const
        ).map(([name, title]) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              headerShown: true,
              title,
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
              headerShadowVisible: false,
            }}
          />
        ))}
        <Stack.Screen
          name="yazar/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="cevirmen/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="yayinevi/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="bildirimler"
          options={{
            headerShown: true,
            title: "Bildirimler",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="hesap-duzenle"
          options={{
            headerShown: true,
            title: "Hesap Ayarları",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="favoriler"
          options={{
            headerShown: true,
            title: "Favorilerim",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="listelerim"
          options={{
            headerShown: true,
            title: "Listelerim",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="liste/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="rozetler"
          options={{
            headerShown: true,
            title: "Rozet Galerisi",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="puan-tablosu"
          options={{
            headerShown: true,
            title: "Puan Tablosu",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="bloglar"
          options={{
            headerShown: true,
            title: "Bloglar",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="blog/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="videolar"
          options={{
            headerShown: true,
            title: "Videolar",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="video/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="kulupler"
          options={{
            headerShown: true,
            title: "Kulüpler",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="kulup/[slug]"
          options={{
            headerShown: false,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="kategori/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="kategoriler"
          options={{
            headerShown: true,
            title: "Kategoriler",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="premium"
          options={{
            headerShown: true,
            title: "Premium",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="puan-magazasi"
          options={{
            headerShown: true,
            title: "Puan Mağazası",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="askida-kitap"
          options={{
            headerShown: true,
            title: "Askıda Kitap",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="askida-kitap/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="askida-kitap/yeni"
          options={{
            headerShown: true,
            title: "Yeni İlan",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="sepetim"
          options={{
            headerShown: true,
            title: "Sepetim",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="siparislerim"
          options={{
            headerShown: true,
            title: "Siparişlerim",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="ilanlarim"
          options={{
            headerShown: true,
            title: "İlanlarım",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: HEADER_TITLE,
            headerShadowVisible: false,
          }}
        />
      </Stack.Protected>
      </Stack>
      {Boolean(profile) && <BottomTabBar />}
      <ActionSheetHost />
    </View>
  );
}
