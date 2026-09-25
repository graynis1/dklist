import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { getStore, toggleStoreFavorite, toggleCartItem, type StoreDetail } from "@/api/store";

export default function AskidaKitapDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getStore(slug);
    if (!ignore?.current) {
      setStore(result.store);
      setFavoriteCount(result.favoriteCount);
      setIsFavorited(result.isFavorited);
      setInCart(result.inCart);
    }
  }, [slug]);

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

  async function onFavorite() {
    setSaving(true);
    try {
      await toggleStoreFavorite(slug);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onCart() {
    setSaving(true);
    try {
      await toggleCartItem(slug);
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>İlan bulunamadı.</ThemedText>
      </View>
    );
  }

  const isPaid = store.listingType === "paid" && store.price;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      {store.pictures.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {store.pictures.map((pic, i) => (
            <Image key={i} source={{ uri: pic }} style={{ width: 220, height: 220, borderRadius: 8 }} resizeMode="cover" />
          ))}
        </ScrollView>
      )}

      <ThemedText variant="headline">{store.title}</ThemedText>
      <ThemedText variant="title" color={colors.accent700}>{isPaid ? `${store.price!.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}</ThemedText>
      {store.location && <ThemedText variant="caption" muted>{store.location}</ThemedText>}

      <ThemedText
        variant="body"
        onPress={() => router.push({ pathname: "/profil/[username]", params: { username: store.ownerUsername } })}
        color={colors.accent}
      >
        @{store.ownerUsername} {store.ownerSellerScore != null && `· ⭐ ${store.ownerSellerScore.toFixed(1)} (${store.ownerSellerRatingCount})`}
      </ThemedText>

      <ThemedText variant="body">{store.content}</ThemedText>

      {store.book && (
        <ThemedText variant="caption" color={colors.accent} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: store.book!.slug } })}>
          Kitap: {store.book.name}
        </ThemedText>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Button
          title={isFavorited ? `Favorilendi ✓ (${favoriteCount})` : `Favorile (${favoriteCount})`}
          variant={isFavorited ? "primary" : "secondary"}
          onPress={onFavorite}
          disabled={saving}
          style={{ flex: 1 }}
        />
        {isPaid ? (
          <Button title={inCart ? "Sepette ✓" : "Sepete Ekle"} variant={inCart ? "primary" : "secondary"} onPress={onCart} disabled={saving} style={{ flex: 1 }} />
        ) : (
          <Button
            title="Satıcıya Yaz"
            variant="secondary"
            onPress={() => router.push({ pathname: "/mesajlar/[username]", params: { username: store.ownerUsername } })}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </ScrollView>
  );
}
