import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { getStore, toggleStoreFavorite, toggleCartItem, rateSeller, addSellerReview, type StoreDetail } from "@/api/store";

export default function AskidaKitapDetailScreen() {
  const { colors, spacing, fontFamily } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [myRatingOfSeller, setMyRatingOfSeller] = useState<number | null>(null);
  const [sellerReviews, setSellerReviews] = useState<EntityComment[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getStore(slug);
    if (!ignore?.current) {
      setStore(result.store);
      setFavoriteCount(result.favoriteCount);
      setIsFavorited(result.isFavorited);
      setInCart(result.inCart);
      setPinned(result.pinned);
      setMyRatingOfSeller(result.myRatingOfSeller);
      setSellerReviews(result.sellerReviews);
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

  async function submitRating(value: number) {
    setRatingSaving(true);
    try {
      await rateSeller(slug, value);
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Puan verilemedi.");
    } finally {
      setRatingSaving(false);
    }
  }

  async function submitReview() {
    const trimmed = reviewText.trim();
    if (trimmed.length < 2) return;
    setReviewSaving(true);
    try {
      await addSellerReview(slug, trimmed);
      setReviewText("");
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setReviewSaving(false);
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

      {pinned && <ThemedText variant="caption" color={colors.accent}>★ Öne Çıkan İlan</ThemedText>}
      <ThemedText variant="headline">{store.title}</ThemedText>
      <ThemedText variant="title" color={colors.accent700}>{isPaid ? `${store.price!.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}</ThemedText>
      {isPaid && (
        <ThemedText variant="caption" muted>
          {store.shippingFee ? `+ ${store.shippingFee.toLocaleString("tr-TR")} ₺ kargo` : "kargo dahil"}
        </ThemedText>
      )}
      {store.location && <ThemedText variant="caption" muted>{store.location}</ThemedText>}
      {store.shipment && <ThemedText variant="caption" muted>Kargo: {store.shipment}</ThemedText>}

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

      <View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md }}>
        <ThemedText variant="label" color={colors.textMuted}>
          Bu satıcıyı değerlendir {myRatingOfSeller ? `(${myRatingOfSeller}/10)` : ""}
        </ThemedText>
        <ThemedText variant="caption" muted>Sadece bu satıcıdan gerçekten bir ilan satın almış üyeler puan/yorum bırakabilir.</ThemedText>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <ThemedText
              key={n}
              variant="title"
              onPress={() => !ratingSaving && submitRating(n)}
              color={myRatingOfSeller != null && n <= myRatingOfSeller ? colors.accent : colors.neutral400}
              style={{ fontFamily: fontFamily.headingSemibold, fontSize: 18 }}
            >
              ★
            </ThemedText>
          ))}
        </View>
      </View>

      <EntityCommentSection
        comments={sellerReviews}
        commentText={reviewText}
        onCommentTextChange={setReviewText}
        onSubmitComment={submitReview}
        submitting={reviewSaving}
        onReplied={load}
      />
    </ScrollView>
  );
}
