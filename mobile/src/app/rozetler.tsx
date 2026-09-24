import { useCallback, useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getBadgeGallery, type PublicBadgeItem } from "@/api/community";

export default function RozetlerScreen() {
  const { colors, spacing, radius } = useTheme();
  const [badges, setBadges] = useState<PublicBadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getBadgeGallery();
    if (!ignore?.current) setBadges(result.badges);
  }, []);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={badges}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      renderItem={({ item }) => (
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title">{item.name}</ThemedText>
            <ThemedText variant="caption" muted>{item.comment}</ThemedText>
            {item.milestoneThreshold != null && (
              <ThemedText variant="caption" color={colors.accent700}>{item.milestoneThreshold} puana ulaşınca kazanılır</ThemedText>
            )}
          </View>
          <ThemedText variant="bodySemibold" color={colors.accent}>{item.earnedByCount}</ThemedText>
        </View>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
          <ThemedText variant="body" muted>Henüz rozet yok.</ThemedText>
        </View>
      }
    />
  );
}
