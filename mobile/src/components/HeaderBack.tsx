import { Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeftIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";

/** Back chevron for screens that draw their own header (tab roots); hidden when there's nothing to go back to. */
export function HeaderBack() {
  const { colors } = useTheme();
  if (!router.canGoBack()) return null;
  return (
    <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginLeft: -6 }} accessibilityLabel="Geri">
      <ChevronLeftIcon size={28} color={colors.text} />
    </Pressable>
  );
}
