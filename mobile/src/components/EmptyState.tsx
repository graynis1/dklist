import { View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingHorizontal: spacing["2xl"], paddingVertical: spacing["3xl"], gap: spacing.sm }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs }}>
        {icon}
      </View>
      <ThemedText variant="headline" style={{ textAlign: "center", fontSize: 19, lineHeight: 25 }}>{title}</ThemedText>
      {subtitle && (
        <ThemedText variant="body" muted style={{ textAlign: "center", lineHeight: 21 }}>
          {subtitle}
        </ThemedText>
      )}
      {actionLabel && onAction && <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.sm, alignSelf: "center" }} />}
    </View>
  );
}

export function SectionHeader({ title, count, actionLabel, onAction }: { title: string; count?: number; actionLabel?: string; onAction?: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm }}>
      <ThemedText variant="title" style={{ fontSize: 18 }}>
        {title}
        {count != null ? <ThemedText variant="body" muted>{`  ${count}`}</ThemedText> : null}
      </ThemedText>
      {actionLabel && onAction && (
        <ThemedText variant="bodySemibold" color={colors.accent} onPress={onAction} suppressHighlighting>
          {actionLabel}
        </ThemedText>
      )}
    </View>
  );
}
