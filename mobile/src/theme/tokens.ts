/**
 * Design tokens. Started as a 1:1 port of the web reference (tight 2-7px
 * radii, serif everywhere); revised 2026-10 after the maintainer judged the
 * app amateurish next to Goodreads/StoryGraph/1000Kitap. The bronze accent
 * ramp is the brand and stays; the UI now uses a sans-serif (Inter) with
 * the serif kept for brand/display moments, a warm paper background,
 * hairline dividers, native-feeling radii and soft shadows.
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  divider: string;
  card: string;
  accent: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;
  accent100: string;
  accent200: string;
  accent300: string;
  accent400: string;
  accent500: string;
  accent600: string;
  accent700: string;
  accent800: string;
  accent900: string;
}

export const palette: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    bg: "#f5f3ef",
    surface: "#eeebe5",
    text: "#1c1a17",
    textMuted: "#6e6961",
    divider: "rgba(28,26,23,0.09)",
    card: "#ffffff",
    accent: "#b68235",
    neutral100: "#f8f6f3",
    neutral200: "#efece7",
    neutral300: "#dedad3",
    neutral400: "#bdb7ae",
    neutral500: "#9c968c",
    neutral600: "#7d776e",
    neutral700: "#5f5a52",
    neutral800: "#423e38",
    neutral900: "#2b2824",
    accent100: "#fff3e4",
    accent200: "#ffe3bf",
    accent300: "#facb8d",
    accent400: "#e1ad66",
    accent500: "#c28d41",
    accent600: "#a06f24",
    accent700: "#7d5411",
    accent800: "#5a3b0a",
    accent900: "#3a270d",
  },
  dark: {
    bg: "#121110",
    surface: "#1d1b18",
    text: "#f1ece4",
    textMuted: "#9d968b",
    divider: "rgba(241,236,228,0.10)",
    card: "#1c1a17",
    // Same ramp, but the reference deliberately opens the accent up on dark
    // (lighter #e1ad66 as the "on-dark" primary tone rather than the light
    // theme's darker #b68235) - "aynı ton, dark üstünde açılır" per its own
    // design-system sheet.
    accent: "#e1ad66",
    neutral100: "#211d16",
    neutral200: "#2b271e",
    neutral300: "#3a352c",
    neutral400: "#514a3d",
    neutral500: "#6b6353",
    neutral600: "#847a66",
    neutral700: "#9a9184",
    neutral800: "#c9c2b4",
    neutral900: "#efe9de",
    accent100: "#3a270d",
    accent200: "#5a3b0a",
    accent300: "#7d5411",
    accent400: "#a06f24",
    accent500: "#c28d41",
    accent600: "#e1ad66",
    accent700: "#facb8d",
    accent800: "#ffe3bf",
    accent900: "#fff3e4",
  },
};

/**
 * Inter for the interface (body, buttons, labels, metadata) + Cormorant
 * Garamond for brand/display moments + Lora for long-form reading (blog
 * bodies, quotes). Each weight is its own registered family - on Android a
 * `fontWeight` on a custom font silently falls back to the system font, so
 * ThemedText maps weights to these families instead.
 */
export const fontFamily = {
  headingRegular: "CormorantGaramond_400Regular",
  headingSemibold: "CormorantGaramond_600SemiBold",
  headingSemiboldItalic: "CormorantGaramond_600SemiBold_Italic",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemibold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  bodyExtraBold: "Inter_800ExtraBold",
  readingRegular: "Lora_400Regular",
  readingItalic: "Lora_400Regular_Italic",
  readingSemibold: "Lora_600SemiBold",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 18,
  pill: 999,
} as const;

/**
 * The reference's CSS shadows (`--shadow-sm/md/lg`) don't translate
 * directly - RN needs real per-platform elevation. Android only ever
 * honors a flat `elevation` (no color/offset control), iOS honors the
 * shadow* props. Tuned to *read* the same relative weight as the
 * reference's three steps, not to match its exact CSS blur/spread values
 * (which have no Android equivalent at all).
 */
export const shadow = {
  sm: {
    shadowColor: "#3a2f22",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#3a2f22",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: "#2d2b2b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
