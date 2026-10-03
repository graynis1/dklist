import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { fontFamily as FF } from "@/theme/tokens";

/**
 * Type scale. Interface text is Inter; the serif families are kept for
 * brand moments (`brand`, `bookTitle`) and reading (`quote`, `reading`).
 */
export type TextVariant =
  | "display" // 28px bold - screen titles ("Keşfet", "Kitaplığım")
  | "headline" // 22px bold - onboarding/empty-state headlines, section heroes
  | "title" // 16px semibold - card titles, list rows
  | "label" // 11.5px semibold, tracked caps - kickers/section labels
  | "body" // 15px regular - paragraphs
  | "bodySemibold" // 15px semibold - emphasized inline text
  | "caption" // 12.5px regular - metadata
  | "quote" // serif italic - alıntı blocks
  | "reading" // serif regular - long-form text
  | "brand" // display serif - logo-like moments
  | "bookTitle"; // serif semibold - a book's own title on its hero

type FamilyKey = keyof typeof FF;

const VARIANT_STYLE: Record<TextVariant, { family: FamilyKey; fontSize: number; letterSpacing?: number; textTransform?: "uppercase"; lineHeight?: number }> = {
  display: { family: "bodyBold", fontSize: 28, letterSpacing: -0.6 },
  headline: { family: "bodyBold", fontSize: 22, letterSpacing: -0.4 },
  title: { family: "bodySemibold", fontSize: 16, letterSpacing: -0.2 },
  label: { family: "bodySemibold", fontSize: 11.5, letterSpacing: 0.7, textTransform: "uppercase" },
  body: { family: "bodyRegular", fontSize: 15 },
  bodySemibold: { family: "bodySemibold", fontSize: 15, letterSpacing: -0.1 },
  caption: { family: "bodyRegular", fontSize: 12.5 },
  quote: { family: "readingItalic", fontSize: 15.5 },
  reading: { family: "readingRegular", fontSize: 16, lineHeight: 26 },
  brand: { family: "headingSemibold", fontSize: 30 },
  bookTitle: { family: "headingSemibold", fontSize: 26, lineHeight: 30 },
};

const INTER_BY_WEIGHT: Record<string, string> = {
  "100": FF.bodyRegular,
  "200": FF.bodyRegular,
  "300": FF.bodyRegular,
  "400": FF.bodyRegular,
  normal: FF.bodyRegular,
  "500": FF.bodyMedium,
  "600": FF.bodySemibold,
  "700": FF.bodyBold,
  bold: FF.bodyBold,
  "800": FF.bodyExtraBold,
  "900": FF.bodyExtraBold,
};

const INTER_FAMILIES = new Set<string>([FF.bodyRegular, FF.bodyMedium, FF.bodySemibold, FF.bodyBold, FF.bodyExtraBold]);

export function ThemedText({
  variant = "body",
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; muted?: boolean }) {
  const theme = useTheme();
  const v = VARIANT_STYLE[variant];
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;

  // A custom font plus `fontWeight` renders in the system font on Android.
  // Turn the weight into the matching Inter family instead (only when the
  // text is Inter - serif variants keep their own family).
  let family = (flat.fontFamily as string | undefined) ?? FF[v.family];
  let fontWeight = flat.fontWeight;
  if (fontWeight != null && INTER_FAMILIES.has(family)) {
    family = INTER_BY_WEIGHT[String(fontWeight)] ?? family;
    fontWeight = undefined;
  }

  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: v.fontSize,
          letterSpacing: v.letterSpacing,
          textTransform: v.textTransform,
          lineHeight: v.lineHeight,
          color: color ?? (muted ? theme.colors.textMuted : theme.colors.text),
        },
        flat,
        { fontFamily: family, fontWeight },
      ]}
    />
  );
}
