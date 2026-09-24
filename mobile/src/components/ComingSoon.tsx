import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

/** Honest placeholder for tabs not built yet this pass - a real "yakında"
 * screen, not a silently-empty blank one. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const { colors, spacing } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"], gap: spacing.sm }}>
        <ThemedText variant="headline">{title}</ThemedText>
        <ThemedText variant="body" muted style={{ textAlign: "center" }}>
          {description}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
