import { useEffect, useState } from "react";
import { View, Pressable, Keyboard, Platform } from "react-native";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rss, Search, Library, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";

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
        backgroundColor: colors.bg,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
        height: 58 + insets.bottom,
        paddingTop: 8,
        paddingBottom: insets.bottom,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(`${tab.href}/`));
        const color = active ? colors.accent : colors.neutral500;
        return (
          <Pressable
            key={tab.href}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (pathname !== tab.href) router.replace(tab.href as never);
            }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
          >
            <tab.icon color={color} size={24} strokeWidth={2.25} />
            <ThemedText variant="caption" color={color} style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10.5 }}>
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
        style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
      >
        {profile ? (
          <Avatar id={profile.id} name={profile.name ?? profile.username} imageUrl={profile.image} size={24} frameColor={profile.profileFrame} frameTier={profile.frameTier} />
        ) : (
          <Avatar id={0} name="?" size={24} />
        )}
        <ThemedText
          variant="caption"
          color={pathname === "/profil" ? colors.accent : colors.neutral500}
          style={{ fontFamily: fontFamily.bodyMedium, fontSize: 10.5 }}
        >
          Profil
        </ThemedText>
      </Pressable>
    </View>
  );
}
