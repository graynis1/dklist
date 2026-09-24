import { useCallback, useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/auth/AuthContext";
import { getLeaderboard, type LeaderboardEntry, type UserWeeklyRank } from "@/api/community";

export default function PuanTablosuScreen() {
  const { colors, spacing } = useTheme();
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<UserWeeklyRank | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getLeaderboard();
    if (!ignore?.current) {
      setEntries(result.leaderboard);
      setMyRank(result.myRank);
    }
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
      data={entries}
      keyExtractor={(item) => String(item.userId)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xs }}
      ListHeaderComponent={
        myRank && (
          <View style={{ marginBottom: spacing.md, alignItems: "center" }}>
            <ThemedText variant="body" muted>Bu hafta sıralaman</ThemedText>
            <ThemedText variant="headline" color={colors.accent}>#{myRank.rank}</ThemedText>
            <ThemedText variant="caption" muted>{myRank.points} puan · {myRank.totalRanked} kişi arasında</ThemedText>
          </View>
        )
      }
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/profil/[username]", params: { username: item.username } })}
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            alignItems: "center",
            padding: spacing.sm,
            backgroundColor: item.username === profile?.username ? `${colors.accent}14` : "transparent",
            borderRadius: 8,
          }}
        >
          <ThemedText variant="bodySemibold" style={{ width: 28 }}>{index + 1}</ThemedText>
          <Avatar id={item.userId} name={item.username} imageUrl={item.image} size={36} />
          <ThemedText variant="body" style={{ flex: 1 }}>@{item.username}</ThemedText>
          <ThemedText variant="bodySemibold" color={colors.accent}>{item.points}</ThemedText>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Bu hafta henüz kimse puan kazanmadı.</ThemedText>
        </View>
      }
    />
  );
}
