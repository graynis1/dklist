import { useEffect } from "react";
import { View, ActivityIndicator, useColorScheme, Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import {
  useFonts as useCormorantFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { useFonts as useLoraFonts, Lora_400Regular, Lora_600SemiBold } from "@expo-google-fonts/lora";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { palette } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;

  const [cormorantLoaded] = useCormorantFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
  });
  const [loraLoaded] = useLoraFonts({ Lora_400Regular, Lora_600SemiBold });
  const fontsReady = cormorantLoaded && loraLoaded;

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
    <AuthProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </AuthProvider>
  );
}

/**
 * `Stack.Protected` (expo-router's own documented auth-flow primitive,
 * not a hand-rolled redirect) - a screen inside a `guard={false}` block is
 * simply not part of the navigator, and Expo Router automatically steers
 * navigation away from it if it was active. No competing root `index.tsx`
 * needed (one was tried first and removed - it collided with `(tabs)`'s
 * own `index.tsx` for the `/` path, a real routing conflict, not a style
 * choice). `profile === undefined` (still checking SecureStore) shows a
 * loading view rather than flashing the login screen for one frame.
 */
function RootNavigator() {
  const { profile } = useAuth();
  const colors = useColorScheme() === "dark" ? palette.dark : palette.light;

  if (profile === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(profile)}>
        <Stack.Screen name="(tabs)" />
        {/* Detail screens reachable from more than one tab (Keşfet/
            Kitaplığım both link to a book; the Mesajlar tab's conversation
            list pushes a thread) - real Stack screens, not nested inside
            the tab navigator itself, so they get a normal push/back
            transition instead of swapping the whole tab bar away. */}
        <Stack.Screen
          name="kitap/[slug]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.accent,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="mesajlar/[username]"
          options={{
            headerShown: true,
            title: "",
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.accent,
            headerShadowVisible: false,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
