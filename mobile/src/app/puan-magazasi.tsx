import { useCallback, useEffect, useState } from "react";
import { View, FlatList, ActivityIndicator, Alert } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getPointStore, redeemReward, equipFrame, type PointRewardItem } from "@/api/pointStore";

export default function PuanMagazasiScreen() {
  const { colors, spacing, radius } = useTheme();
  const [rewards, setRewards] = useState<PointRewardItem[]>([]);
  const [redeemedIds, setRedeemedIds] = useState<number[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [activeFrame, setActiveFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getPointStore();
    if (!ignore?.current) {
      setRewards(result.rewards);
      setRedeemedIds(result.redeemedIds);
      setTotalPoints(result.totalPoints);
      setActiveFrame(result.activeFrame);
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

  async function onRedeem(reward: PointRewardItem) {
    setBusyId(reward.id);
    try {
      const result = await redeemReward(reward.id);
      if (result.status === "error") {
        Alert.alert("Olmadı", result.message ?? "Ödül alınamadı.");
      } else {
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onEquip(reward: PointRewardItem) {
    setBusyId(reward.id);
    try {
      await equipFrame(activeFrame === reward.rewardValue ? null : reward.rewardValue);
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
      data={rewards}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      ListHeaderComponent={
        <ThemedText variant="headline" style={{ marginBottom: spacing.md }}>{totalPoints} puanın var</ThemedText>
      }
      renderItem={({ item }) => {
        const owned = redeemedIds.includes(item.id);
        const isFrame = item.rewardType === "profile_frame";
        const equipped = isFrame && activeFrame === item.rewardValue;
        const canAfford = totalPoints >= item.pointCost;
        return (
          <View style={{ padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, gap: spacing.xs }}>
            <ThemedText variant="title">{item.name}</ThemedText>
            {item.description && <ThemedText variant="caption" muted>{item.description}</ThemedText>}
            <ThemedText variant="caption" color={colors.accent}>{item.pointCost} puan</ThemedText>
            {owned ? (
              isFrame && (
                <Button
                  title={equipped ? "Takılı ✓" : "Tak"}
                  variant={equipped ? "primary" : "secondary"}
                  onPress={() => onEquip(item)}
                  disabled={busyId === item.id}
                />
              )
            ) : (
              <Button
                title={canAfford ? "Al" : "Yetersiz Puan"}
                variant="secondary"
                onPress={() => onRedeem(item)}
                disabled={busyId === item.id || !canAfford}
              />
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Mağazada şu an ödül yok.</ThemedText>
        </View>
      }
    />
  );
}
