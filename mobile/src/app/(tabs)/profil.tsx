import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronRightIcon, UserIcon, HeartIcon, ListIcon, SettingsIcon, AwardIcon, TrophyIcon, BellIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";

const MENU: {
  icon: typeof UserIcon;
  label: string;
  href: "/profil/[username]" | "/favoriler" | "/listelerim" | "/hesap-duzenle" | "/bildirimler" | "/rozetler" | "/puan-tablosu";
}[] = [
  { icon: UserIcon, label: "Profilimi Görüntüle", href: "/profil/[username]" },
  { icon: BellIcon, label: "Bildirimler", href: "/bildirimler" },
  { icon: HeartIcon, label: "Favorilerim", href: "/favoriler" },
  { icon: ListIcon, label: "Listelerim", href: "/listelerim" },
  { icon: AwardIcon, label: "Rozet Galerisi", href: "/rozetler" },
  { icon: TrophyIcon, label: "Puan Tablosu", href: "/puan-tablosu" },
  { icon: SettingsIcon, label: "Hesap Ayarları", href: "/hesap-duzenle" },
];

export default function ProfilScreen() {
  const { colors, spacing, radius } = useTheme();
  const { profile, logout } = useAuth();

  // No manual navigation after logout - see login.tsx's own comment;
  // Stack.Protected steers back to (auth) automatically once profile
  // becomes null.
  if (!profile) return null;

  const displayName = [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.lg }}>
          <Avatar id={profile.id} name={displayName} imageUrl={profile.image} size={84} />
          <ThemedText variant="headline" style={{ textAlign: "center" }}>
            {displayName}
          </ThemedText>
          <ThemedText variant="caption" muted>
            @{profile.username}
          </ThemedText>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.divider, padding: spacing.md, gap: spacing.xs }}>
          <ThemedText variant="label" color={colors.textMuted}>
            Hesap
          </ThemedText>
          <ThemedText variant="body">{profile.mail}</ThemedText>
        </View>

        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" }}>
          {MENU.map((item, i) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href === "/profil/[username]" ? { pathname: item.href, params: { username: profile.username } } : item.href)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.divider,
                }}
              >
                <Icon color={colors.text} size={18} />
                <ThemedText variant="body" style={{ flex: 1 }}>{item.label}</ThemedText>
                <ChevronRightIcon color={colors.neutral400} size={18} />
              </Pressable>
            );
          })}
        </View>

        <Button title="Çıkış Yap" variant="secondary" onPress={() => logout()} block />
      </ScrollView>
    </SafeAreaView>
  );
}
