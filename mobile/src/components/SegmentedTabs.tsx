import { ScrollView, Pressable, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";

/** Facebook-profile-style tab strip: plain text tabs with an accent underline
 * on the active one, a hairline under the whole strip, and optional counts. */
export function SegmentedTabs<K extends string>({
  tabs,
  active,
  onChange,
  scrollable = true,
}: {
  tabs: { key: K; label: string; count?: number }[];
  active: K;
  onChange: (key: K) => void;
  scrollable?: boolean;
}) {
  const { colors, spacing } = useTheme();

  const items = tabs.map((t) => {
    const isActive = t.key === active;
    return (
      <Pressable
        key={t.key}
        onPress={() => onChange(t.key)}
        style={{
          flex: scrollable ? undefined : 1,
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm + 1,
          borderBottomWidth: 3,
          borderBottomColor: isActive ? colors.accent : "transparent",
        }}
      >
        <ThemedText variant="bodySemibold" numberOfLines={1} color={isActive ? colors.accent : colors.textMuted}>
          {t.label}
          {t.count != null && t.count > 0 ? <ThemedText variant="caption" color={isActive ? colors.accent : colors.neutral500}>{`  ${t.count}`}</ThemedText> : null}
        </ThemedText>
      </Pressable>
    );
  });

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
          {items}
        </ScrollView>
      ) : (
        <View style={{ flexDirection: "row" }}>{items}</View>
      )}
    </View>
  );
}
