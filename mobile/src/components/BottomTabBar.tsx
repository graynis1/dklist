import { useEffect, useState } from "react";
import { View, Pressable, Keyboard, Platform, StyleSheet } from "react-native";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rss, Search, Library, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { emitTabReselect } from "@/lib/tabEvents";

/**
 * A hand-rolled bottom bar rather than expo-router's `Tabs` navigator -
 * real customer report: most of the app's ~30 secondary screens
 * (Bildirimler, Hesap Ayarları, Askıda Kitap, Kulüpler, ...) are plain
 * root `Stack.Screen`s pushed OUTSIDE the old `(tabs)` group, so the
 * native tab bar vanished the instant you navigated to any of them - only
 * the 5 tab-root screens themselves ever showed it. `Tabs` only keeps its
 * bar visible across screens that are themselves inside the tabs
 * navigator; it can't extend to an unbounded, already-large set of
 * sibling Stack routes without nesting all of them inside per-tab Stacks
 * (a much larger restructure). Rendered as a fixed sibling below the root
 * `<Stack>` in `_layout.tsx` instead - outside the Stack entirely, so it
 * persists across every push, no matter how deep.
 */
const TABS = [
  { href: "/", icon: Rss, label: "Akış" },
  { href: "/kesfet", icon: Search, label: "Keşfet" },
  { href: "/kitapligim", icon: Library, label: "Kitaplığım" },
  { href: "/mesajlar", icon: MessageCircle, label: "Mesajlar" },
] as const;

export function BottomTabBar() {
  const { colors, fontFamily } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // With Android's adjustResize the bar would otherwise ride up and sit
  // between a chat/comment composer and the keyboard.
  useEffect(() => {
    // iOS fires the "will" events before its keyboard animation, so the bar
    // is gone before the screen above it re-lays out; Android only has "did".
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen || pathname === "/barkod" || pathname === "/gonderi-yeni") return null;

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.divider,
        height: 62 + insets.bottom,
        paddingTop: 6,
        paddingBottom: insets.bottom,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
        const color = active ? colors.accent700 : colors.neutral600;
        return (
          <Pressable
            key={tab.href}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (pathname !== tab.href) router.replace(tab.href as never);
              else emitTabReselect(tab.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <View style={{ width: 58, height: 30, alignItems: "center", justifyContent: "center" }}>
              {active && <View style={{ position: "absolute", top: 0, left: 0, width: 58, height: 30, borderRadius: 15, backgroundColor: colors.accent100 }} />}
              <tab.icon color={color} size={22} strokeWidth={active ? 2.4 : 1.9} />
            </View>
            <ThemedText variant="caption" color={active ? colors.text : colors.neutral600} style={{ fontFamily: active ? fontFamily.bodySemibold : fontFamily.bodyMedium, fontSize: 11 }}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          if (pathname !== "/profil") router.replace("/profil");
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: pathname === "/profil" }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}
      >
        <View style={{ width: 58, height: 30, alignItems: "center", justifyContent: "center" }}>
          {pathname === "/profil" && <View style={{ position: "absolute", top: 0, left: 0, width: 58, height: 30, borderRadius: 15, backgroundColor: colors.accent100 }} />}
          <View style={{ borderRadius: 13, borderWidth: pathname === "/profil" ? 2 : 0, borderColor: colors.accent700, padding: pathname === "/profil" ? 1 : 0 }}>
            <Avatar id={profile?.id ?? 0} name={profile ? profile.name ?? profile.username : "?"} imageUrl={profile?.image} size={pathname === "/profil" ? 20 : 24} />
          </View>
        </View>
        <ThemedText
          variant="caption"
          color={pathname === "/profil" ? colors.text : colors.neutral600}
          style={{ fontFamily: pathname === "/profil" ? fontFamily.bodySemibold : fontFamily.bodyMedium, fontSize: 11 }}
        >
          Profil
        </ThemedText>
      </Pressable>
    </View>
  );
}
