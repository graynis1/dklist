import { Pressable, type PressableProps, type GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Real customer report: every button in the app - including primary CTAs
 * like "Giriş Yap"/"Üye Ol" - was a thin-outlined, unfilled button (an
 * earlier deliberate design choice, since overridden: "Butonlar berbat...
 * Facebook'a benzet"). Rebuilt around the pattern real, familiar social
 * apps (Facebook's own primary/secondary button pair) actually use: a
 * solid, confident fill for the primary action and a light neutral fill
 * for the secondary one, both the same rounded-rect shape - not the
 * classical design system's original hairline-outline treatment.
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
  const { colors, radius, spacing, shadow } = useTheme();

  const fill = variant === "primary" ? colors.accent : variant === "secondary" ? colors.neutral200 : "transparent";
  const pressedFill = variant === "primary" ? colors.accent700 : variant === "secondary" ? colors.neutral300 : `${colors.accent}14`;
  const textColor = variant === "primary" ? "#ffffff" : variant === "secondary" ? colors.text : colors.accent;

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
          height: 48,
          borderRadius: radius.lg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.45 : 1,
          backgroundColor: pressed ? pressedFill : fill,
          width: block ? "100%" : undefined,
          alignSelf: block ? "stretch" : "flex-start",
          ...(variant === "primary" && !disabled ? shadow.sm : null),
        },
        style as object,
      ]}
      {...rest}
    >
      <ThemedText variant="title" color={textColor} style={{ fontWeight: variant === "ghost" ? "500" : "600" }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}
