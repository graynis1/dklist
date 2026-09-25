import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { UsersIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getClubList, type ClubListItem } from "@/api/clubs";

export default function KuluplerScreen() {
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<ClubListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getClubList();
    if (!ignore?.current) setItems(result.items);
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
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/kulup/[slug]", params: { slug: item.slug } })}
          style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, gap: 4 }}
        >
          <ThemedText variant="title">{item.name}</ThemedText>
          <ThemedText variant="caption" muted numberOfLines={2}>{item.description}</ThemedText>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center", marginTop: 4 }}>
            <UsersIcon color={colors.textMuted} size={14} />
            <ThemedText variant="caption" muted>{item.memberCount} üye</ThemedText>
            {item.currentBookName && (
              <ThemedText variant="caption" color={colors.accent}> · Şu an: {item.currentBookName}</ThemedText>
            )}
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Henüz kulüp yok.</ThemedText>
        </View>
      }
    />
  );
}
