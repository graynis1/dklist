import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { getBlockedUsers, type BlockedUserItem } from "@/api/blockedUsers";
import { toggleBlock } from "@/api/profileOther";

export default function EngellenenlerScreen() {
  const { colors, spacing, radius } = useTheme();
  const [users, setUsers] = useState<BlockedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getBlockedUsers();
    if (!ignore?.current) setUsers(result.users);
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

  async function onUnblock(item: BlockedUserItem) {
    setBusyId(item.id);
    try {
      await toggleBlock(item.username);
      await load();
    } finally {
      setBusyId(null);
    }
  }

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
      data={users}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      renderItem={({ item }) => (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            alignItems: "center",
            padding: spacing.sm,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.divider,
          }}
        >
          <Pressable
            onPress={() => router.push({ pathname: "/profil/[username]", params: { username: item.username } })}
            style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", flex: 1 }}
          >
            <Avatar id={item.id} name={item.username} imageUrl={item.image} size={40} />
            <ThemedText variant="body">@{item.username}</ThemedText>
          </Pressable>
          <Button title="Engeli Kaldır" variant="secondary" onPress={() => onUnblock(item)} disabled={busyId === item.id} />
        </View>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Engellediğin bir kullanıcı yok.</ThemedText>
        </View>
      }
    />
  );
}
