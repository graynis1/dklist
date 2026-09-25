import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getMyOrders, type StoreOrderView } from "@/api/store";

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  paid: "Ödendi",
  shipped: "Kargoya Verildi",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
  refunded: "İade Edildi",
};

export default function SiparislerimScreen() {
  const { colors, spacing, radius } = useTheme();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [orders, setOrders] = useState<StoreOrderView[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: "buyer" | "seller", ignore?: { current: boolean }) => {
    const result = await getMyOrders(r);
    if (!ignore?.current) setOrders(result.orders);
  }, []);

  useEffect(() => {
    const ignore = { current: false };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load(role, ignore).finally(() => {
      if (!ignore.current) setLoading(false);
    });
    return () => {
      ignore.current = true;
    };
  }, [load, role]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", gap: spacing.xs, padding: spacing.lg, paddingBottom: spacing.sm }}>
        {(["buyer", "seller"] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRole(r)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5, borderColor: role === r ? colors.accent : colors.divider }}
          >
            <ThemedText variant="caption" color={role === r ? colors.accent : colors.text}>
              {r === "buyer" ? "Alıcı Olarak" : "Satıcı Olarak"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.store.slug } })}
              style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider }}
            >
              {item.store.image && <Image source={{ uri: item.store.image }} style={{ width: 48, height: 48, borderRadius: 8 }} />}
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="body" numberOfLines={1}>{item.store.title}</ThemedText>
                <ThemedText variant="caption" muted>
                  {role === "buyer" ? `@${item.seller.username}` : `@${item.buyer.username}`} · {item.amount.toLocaleString("tr-TR")} ₺
                </ThemedText>
              </View>
              <ThemedText variant="caption" color={colors.accent}>{STATUS_LABELS[item.status] ?? item.status}</ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
              <ThemedText variant="body" muted>Henüz siparişin yok.</ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}
