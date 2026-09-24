import { Text, type TextProps } from "react-native";
import { useTheme } from "@/theme/useTheme";

/**
 * Reference's own type rule (its design-system sheet, verbatim): "Büyük
 * başlıklar 400 ağırlıkta, arayüz başlıkları en fazla 600" - large DISPLAY
 * headings (a screen's own big title, an onboarding headline) stay at the
 * heading font's regular weight; smaller interface headings (card titles,
 * button labels) go up to semibold. Encoded as variants so no screen has
 * to remember which weight goes with which size.
 */
export type TextVariant =
  | "display" // 30-32px, heading font, regular - screen titles ("Akış", "Profilim")
  | "headline" // 22-26px, heading font, regular - onboarding/empty-state headlines
  | "title" // 15-17px, heading font, semibold - card titles, book titles
  | "label" // 11-13px, heading font, semibold, tracked - kickers/section labels
  | "body" // 14-15.5px, body font, regular - paragraphs
  | "bodySemibold" // 14-15px, body font, semibold - emphasized inline text
  | "caption" // 11-12.5px, body font, regular, muted - metadata
  | "quote"; // italic heading font - alıntı/quote blocks

const VARIANT_STYLE: Record<TextVariant, { fontFamily: keyof ReturnType<typeof useTheme>["fontFamily"]; fontSize: number; letterSpacing?: number; textTransform?: "uppercase" }> = {
  display: { fontFamily: "headingRegular", fontSize: 30 },
  headline: { fontFamily: "headingRegular", fontSize: 24 },
  title: { fontFamily: "headingSemibold", fontSize: 16 },
  label: { fontFamily: "headingSemibold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" },
  body: { fontFamily: "bodyRegular", fontSize: 15 },
  bodySemibold: { fontFamily: "bodySemibold", fontSize: 14.5 },
  caption: { fontFamily: "bodyRegular", fontSize: 12 },
  quote: { fontFamily: "headingSemiboldItalic", fontSize: 14.5 },
};

export function ThemedText({
  variant = "body",
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; muted?: boolean }) {
  const theme = useTheme();
  const v = VARIANT_STYLE[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: theme.fontFamily[v.fontFamily],
          fontSize: v.fontSize,
          letterSpacing: v.letterSpacing,
          textTransform: v.textTransform,
          color: color ?? (muted ? theme.colors.textMuted : theme.colors.text),
        },
        style,
      ]}
    />
  );
}
