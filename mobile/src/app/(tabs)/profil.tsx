import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";

export default function ProfilScreen() {
  const { colors, spacing } = useTheme();
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

        <Button title="Çıkış Yap" variant="secondary" onPress={() => logout()} block />

        <ThemedText variant="caption" muted style={{ textAlign: "center" }}>
          Diğer ayarlar ve kitaplığın yakında burada olacak.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}
