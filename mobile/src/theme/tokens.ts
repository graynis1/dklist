/**
 * Design tokens ported 1:1 from the reference design (`referans/DKList iOS
 * App.dc.html` + its linked `_ds/classical-.../styles.css`) - not
 * reinterpreted. Same hex values, same tight "classical" radii (2/4/7px,
 * deliberately NOT the bouncy 12-24px radii most mobile UIs default to),
 * same bronze/gold single accent. Extended here only where the reference
 * (a static web mockup) didn't need to decide something a real app must
 * (platform shadow/elevation, RN font-weight numerics instead of CSS
 * font-weight keywords).
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
    bg: "#f3f2f2",
    surface: "#eae9e9",
    text: "#201f1d",
    textMuted: "#605d5d",
    divider: "rgba(32,31,29,0.16)",
    card: "#ffffff",
    accent: "#b68235",
    neutral100: "#f8f4f4",
    neutral200: "#eae7e7",
    neutral300: "#d7d3d3",
    neutral400: "#bab6b6",
    neutral500: "#9b9797",
    neutral600: "#7d7979",
    neutral700: "#605d5d",
    neutral800: "#444141",
    neutral900: "#2d2b2b",
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
    bg: "#141210",
    surface: "#211d16",
    text: "#efe9de",
    textMuted: "#9a9184",
    divider: "#3a352c",
    card: "#211d16",
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
 * Cormorant Garamond (headings, display) + Lora (body) - both loaded via
 * @expo-google-fonts in `_layout.tsx`. RN's `fontWeight` is a string enum
 * ("400"/"600"/"700"...), not usable to pick a variable font's registered
 * weight the way CSS `font-weight` + one variable file can - each weight
 * needed is its own named font family from the *_google-fonts package.
 */
export const fontFamily = {
  headingRegular: "CormorantGaramond_400Regular",
  headingSemibold: "CormorantGaramond_600SemiBold",
  headingSemiboldItalic: "CormorantGaramond_600SemiBold_Italic",
  bodyRegular: "Lora_400Regular",
  bodySemibold: "Lora_600SemiBold",
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

// Same tight radii as the web reference - the classical design system's
// whole point is that it does NOT read as a default bouncy mobile UI.
export const radius = {
  sm: 2,
  md: 5,
  lg: 8,
  xl: 14,
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
    shadowColor: "#2d2b2b",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#2d2b2b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: "#2d2b2b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
