import { Pressable, type PressableProps, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Ported from the reference's `.btn-primary`/`.btn-secondary`/`.btn-ghost`
 * - a deliberate choice worth preserving, not "fixing": every CTA in the
 * reference (including onboarding's "İleri", the login screen's "Giriş
 * Yap") is an OUTLINED button (accent border + accent text, no fill), not
 * the solid-filled button most mobile UIs default to. That's this design
 * system's own refined, understated character - a filled button here
 * would read as a generic template, not this app.
 */
export function Button({
  title,
  variant = "primary",
  block = false,
  disabled,
  style,
  onPress,
  ...rest
}: PressableProps & { title: string; variant?: ButtonVariant; block?: boolean; disabled?: boolean }) {
  const { colors, radius, spacing } = useTheme();

  const borderColor = variant === "primary" ? colors.accent : variant === "secondary" ? colors.divider : "transparent";
  const textColor = variant === "secondary" ? colors.text : colors.accent;

  // Design brief's own explicit ask: a native app should have real haptic
  // feedback at meaningful moments, not just visual state - a light tap
  // impact on every primary action, matching the reference's iOS-first
  // feel on Android too (expo-haptics is cross-platform).
  function handlePress(e: GestureResponderEvent) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          height: 52,
          borderRadius: radius.md,
          borderWidth: variant === "ghost" ? 0 : 1.5,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
          backgroundColor: pressed && variant !== "ghost" ? `${colors.accent}1F` : "transparent",
          width: block ? "100%" : undefined,
          alignSelf: block ? "stretch" : "flex-start",
        },
        style as object,
      ]}
      {...rest}
    >
      <ThemedText variant="title" color={textColor}>
        {title}
      </ThemedText>
    </Pressable>
  );
}
