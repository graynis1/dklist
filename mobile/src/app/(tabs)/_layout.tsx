import { Tabs } from "expo-router";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rss, Search, Library, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { Avatar } from "@/components/Avatar";

/**
 * Ported from the reference's tab bar ("Yalın, kalın çizgili geometrik
 * biçimler" - plain, thick-lined geometric shapes) - lucide-react-native's
 * default stroke icons are the same minimal geometric line language, not
 * a different icon set bolted on. One deliberate departure from the
 * mockup: its "Profil" tab is drawn as a plain filled circle placeholder,
 * but the real app has a real signed-in user - uses the actual Avatar
 * (gradient + initials, or a real photo) instead of a generic icon,
 * exactly like the reference's own Akış header does for the same tab.
 */
export default function TabsLayout() {
  const { colors, fontFamily } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.neutral500,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.divider,
          // Base content height (icon+label+breathing room) plus the
          // device's own bottom safe-area inset (Android gesture nav bar /
          // iPhone home indicator) - a fixed height here would either clip
          // under a tall gesture bar or leave dead grey space on a device
          // with none.
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.headingSemibold, fontSize: 10.5 },
        // Real native feel per the design brief's own ask - a light
        // selection tick on every tab switch, not just button presses.
        tabBarButton: ({ onPress, ref: _ref, ...rest }) => (
          <Pressable
            {...rest}
            onPress={(e) => {
              Haptics.selectionAsync().catch(() => {});
              onPress?.(e);
            }}
          />
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Akış", tabBarIcon: ({ color, size }) => <Rss color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="kesfet" options={{ title: "Keşfet", tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="kitapligim" options={{ title: "Kitaplığım", tabBarIcon: ({ color, size }) => <Library color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="mesajlar" options={{ title: "Mesajlar", tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} strokeWidth={2.25} /> }} />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: () =>
            profile ? <Avatar id={profile.id} name={profile.name ?? profile.username} imageUrl={profile.image} size={24} /> : <Avatar id={0} name="?" size={24} />,
        }}
      />
    </Tabs>
  );
}
