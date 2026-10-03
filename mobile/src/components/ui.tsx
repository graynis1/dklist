import { Children, Fragment, isValidElement } from "react";
import { View, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { ChevronRightIcon, type LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

/**
 * Shared list/section primitives - one visual language for every settings-
 * style list, menu and section header in the app (inset grouped cards,
 * neutral icon tiles, hairline separators), instead of each screen drawing
 * its own rows with its own paddings and colors.
 */

export const ROW_ICON = 32;

/** Inset white card that draws hairlines between its children. */
export function Group({ children, title, footer, style }: { children: React.ReactNode; title?: string; footer?: string; style?: ViewStyle }) {
  const { colors, spacing, radius } = useTheme();
  const items = Children.toArray(children).filter((c) => isValidElement(c));
  return (
    <View style={[{ marginHorizontal: spacing.lg }, style]}>
      {title && (
        <ThemedText variant="label" color={colors.textMuted} style={{ marginBottom: 8, marginLeft: 4 }}>
          {title}
        </ThemedText>
      )}
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden" }}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: spacing.lg + ROW_ICON + spacing.md }} />}
            {child}
          </Fragment>
        ))}
      </View>
      {footer && (
        <ThemedText variant="caption" muted style={{ marginTop: 6, marginLeft: 4 }}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

export function IconTile({ icon: Icon, size = ROW_ICON, tone = "neutral" }: { icon: LucideIcon; size?: number; tone?: "neutral" | "accent" | "danger" }) {
  const { colors } = useTheme();
  const bg = tone === "accent" ? colors.accent100 : tone === "danger" ? "#fbe9e7" : colors.neutral200;
  const fg = tone === "accent" ? colors.accent700 : tone === "danger" ? "#c0392b" : colors.text;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Icon size={size * 0.53} color={fg} strokeWidth={2} />
    </View>
  );
}

export function Row({
  icon,
  leading,
  title,
  subtitle,
  value,
  onPress,
  chevron = true,
  destructive,
  tone,
}: {
  icon?: LucideIcon;
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string | number;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  tone?: "neutral" | "accent" | "danger";
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 54, paddingVertical: 10, backgroundColor: pressed ? colors.neutral100 : colors.card, borderRadius: radius.sm })}
    >
      {leading ?? (icon ? <IconTile icon={icon} tone={destructive ? "danger" : tone} /> : null)}
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" color={destructive ? "#c0392b" : colors.text} numberOfLines={1} style={{ fontSize: 15.5 }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" muted numberOfLines={2} style={{ marginTop: 1 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {value != null && value !== "" && (
        <ThemedText variant="body" muted style={{ fontSize: 14.5 }}>
          {value}
        </ThemedText>
      )}
      {onPress && chevron && <ChevronRightIcon size={18} color={colors.neutral400} />}
    </Pressable>
  );
}

/** Section heading with an optional trailing link ("Tümü"). */
export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: ViewStyle }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg }, style]}>
      <ThemedText variant="title" style={{ flex: 1, fontSize: 18, letterSpacing: -0.3 }}>
        {title}
      </ThemedText>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: "row", alignItems: "center" }}>
          <ThemedText variant="body" color={colors.accent700} style={{ fontSize: 14, fontWeight: "600" }}>
            {action}
          </ThemedText>
          <ChevronRightIcon size={16} color={colors.accent700} />
        </Pressable>
      )}
    </View>
  );
}

/** Filter/sort pill - one style app-wide: bronze fill when selected, neutral otherwise. */
export function Chip({ label, active, onPress, count, disabled }: { label: string; active: boolean; onPress: () => void; count?: number; disabled?: boolean }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 34,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: active ? (pressed ? colors.accent700 : colors.accent) : pressed ? colors.neutral300 : colors.neutral200,
      })}
    >
      <ThemedText variant="bodySemibold" color={active ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>
        {label}
      </ThemedText>
      {count != null && count > 0 && (
        <ThemedText variant="caption" color={active ? "rgba(255,255,255,0.85)" : colors.textMuted} style={{ fontSize: 12, fontWeight: "600" }}>
          {count}
        </ThemedText>
      )}
    </Pressable>
  );
}
