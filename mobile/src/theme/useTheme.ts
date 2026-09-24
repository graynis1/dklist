import { useColorScheme } from "react-native";
import { palette, fontFamily, spacing, radius, shadow, type ThemeColors } from "@/theme/tokens";

export interface Theme {
  colors: ThemeColors;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  isDark: boolean;
}

/** Reads the OS-level light/dark preference directly - no manual toggle
 * yet (the design brief's own "dark mode as a first-class second option,
 * not an afterthought" goal is met by having every screen consume this
 * instead of hardcoding light-only colors; a manual override setting is
 * easy to add later without touching any screen). */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return {
    colors: isDark ? palette.dark : palette.light,
    fontFamily,
    spacing,
    radius,
    shadow,
    isDark,
  };
}
