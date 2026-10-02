import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Image, Alert, Pressable, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { HeartIcon, ShoppingCartIcon, MessageCircleIcon, MapPinIcon, TruckIcon, StarIcon, ChevronRightIcon, Share2Icon, MoreHorizontalIcon, TagIcon, PinIcon, SettingsIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { showActionSheet } from "@/components/ActionSheet";
import { getStore, toggleStoreFavorite, toggleCartItem, rateSeller, addSellerReview, setListingStatus, deleteListing, type StoreDetail } from "@/api/store";
import { mediaUrl } from "@/lib/media";
import { shareLink } from "@/lib/share";

const STATUS_LABEL: Record<string, string> = { pending: "Onay bekliyor", active: "Yayında", completed: "Verildi", cancelled: "Yayından kaldırıldı" };

export default function AskidaKitapDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const { profile } = useAuth();
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
  const [photo, setPhoto] = useState(0);

  const load = useCallback(async () => {
    try {
      const result = await getStore(slug);
      setStore(result.store);
      setFavoriteCount(result.favoriteCount);
      setIsFavorited(result.isFavorited);
      setInCart(result.inCart);
      setPinned(result.pinned);
      setMyRatingOfSeller(result.myRatingOfSeller);
      setSellerReviews(result.sellerReviews);
    } catch {
      setStore(null);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  const isOwner = Boolean(store && profile && store.ownerId === profile.id);

  function ownerMenu() {
    if (!store) return;
    const paid = store.listingType === "paid";
    showActionSheet({
      title: store.title,
      message: `Durum: ${STATUS_LABEL[store.status] ?? store.status}`,
      options: [
        ...(store.status === "active"
          ? [
              { text: paid ? "Satıldı olarak işaretle" : "Verildi olarak işaretle", onPress: () => void changeStatus("completed") },
              { text: "Yayından kaldır", onPress: () => void changeStatus("cancelled") },
            ]
          : store.status === "cancelled" || store.status === "completed"
            ? [{ text: "Yeniden yayına al", onPress: () => void changeStatus("active") }]
            : []),
        ...(paid ? [{ text: "Fiyat / stok düzenle", onPress: () => router.push("/ilanlarim") }] : []),
        {
          text: "İlanı sil",
          destructive: true,
          onPress: () =>
            Alert.alert("İlan silinsin mi?", "Bu işlem geri alınamaz.", [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sil",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteListing(store.id);
                    router.back();
                  } catch (err) {
                    Alert.alert("Silinemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
                  }
                },
              },
            ]),
        },
      ],
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerRight: () =>
        store ? (
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Pressable hitSlop={8} onPress={() => shareLink(store.title, `https://dklist.com/askida-kitap/${store.slug}`)}>
              <Share2Icon size={21} color={colors.accent} />
            </Pressable>
            {isOwner && (
              <Pressable hitSlop={8} onPress={ownerMenu}>
                <MoreHorizontalIcon size={22} color={colors.accent} />
              </Pressable>
            )}
          </View>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, store, isOwner, colors.accent]);

  async function changeStatus(status: "active" | "completed" | "cancelled") {
    if (!store) return;
    try {
      await setListingStatus(store.id, status);
      setStore({ ...store, status });
    } catch (err) {
      Alert.alert("Güncellenemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
    }
  }

  async function onFavorite() {
    setSaving(true);
    try {
      await toggleStoreFavorite(slug);
      setIsFavorited((v) => !v);
      setFavoriteCount((n) => n + (isFavorited ? -1 : 1));
    } finally {
      setSaving(false);
    }
  }

  async function onCart() {
    setSaving(true);
    try {
      await toggleCartItem(slug);
      setInCart((v) => !v);
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
      Alert.alert("Puan verilemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
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
      Alert.alert("Yorum eklenemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
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

  const isPaid = store.listingType === "paid" && Boolean(store.price);
  const photos = store.pictures.map((p) => mediaUrl(p)).filter((p): p is string => Boolean(p));

  return (
    <KeyboardScreen style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        {photos.length > 0 ? (
          <View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {photos.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width, height: width * 0.85, backgroundColor: colors.surface }} resizeMode="cover" />
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <View style={{ position: "absolute", bottom: spacing.md, alignSelf: "center", flexDirection: "row", gap: 6 }}>
                {photos.map((_, i) => (
                  <View key={i} style={{ width: i === photo ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === photo ? "#fff" : "rgba(255,255,255,0.55)" }} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={{ width, height: width * 0.5, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
            <TagIcon size={46} color={colors.accent} />
          </View>
        )}

        <View style={{ backgroundColor: colors.card, padding: spacing.lg, gap: spacing.sm, ...shadow.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {pinned && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
                <PinIcon size={11} color={colors.accent800} />
                <ThemedText variant="caption" color={colors.accent800} style={{ fontWeight: "600", fontSize: 11 }}>Öne çıkan</ThemedText>
              </View>
            )}
            {store.status !== "active" && (
              <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: colors.neutral200 }}>
                <ThemedText variant="caption" style={{ fontWeight: "600", fontSize: 11 }}>{STATUS_LABEL[store.status] ?? store.status}</ThemedText>
              </View>
            )}
          </View>
          <ThemedText variant="headline" style={{ fontSize: 24 }}>{store.title}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
            <ThemedText variant="headline" color={colors.accent700} style={{ fontSize: 26 }}>{isPaid ? `${store.price!.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}</ThemedText>
            {isPaid && <ThemedText variant="caption" muted>{store.shippingFee ? `+ ${store.shippingFee.toLocaleString("tr-TR")} ₺ kargo` : "kargo dahil"}</ThemedText>}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 2 }}>
            {store.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MapPinIcon size={14} color={colors.textMuted} />
                <ThemedText variant="caption" muted>{store.location}</ThemedText>
              </View>
            ) : null}
            {store.shipment ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TruckIcon size={14} color={colors.textMuted} />
                <ThemedText variant="caption" muted>{store.shipment}</ThemedText>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <HeartIcon size={14} color={colors.textMuted} />
              <ThemedText variant="caption" muted>{favoriteCount} favori</ThemedText>
            </View>
          </View>
        </View>

        {isOwner ? (
          <Pressable onPress={ownerMenu} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: spacing.lg, marginBottom: 0, height: 48, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent700 : colors.accent })}>
            <SettingsIcon size={18} color="#fff" />
            <ThemedText variant="bodySemibold" color="#fff">İlanı Yönet</ThemedText>
          </Pressable>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 }}>
            <Pressable onPress={onFavorite} disabled={saving} style={({ pressed }) => ({ width: 52, height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
              <HeartIcon size={21} color={isFavorited ? colors.accent : colors.text} fill={isFavorited ? colors.accent : "transparent"} />
            </Pressable>
            {isPaid ? (
              <Pressable onPress={onCart} disabled={saving || store.status !== "active"} style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 8, height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: inCart ? colors.neutral200 : pressed ? colors.accent700 : colors.accent, opacity: store.status !== "active" ? 0.5 : 1 })}>
                <ShoppingCartIcon size={18} color={inCart ? colors.text : "#fff"} />
                <ThemedText variant="bodySemibold" color={inCart ? colors.text : "#fff"}>{inCart ? "Sepette" : "Sepete Ekle"}</ThemedText>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push({ pathname: "/mesajlar/[username]", params: { username: store.ownerUsername } })} style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 8, height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: isPaid ? (pressed ? colors.neutral300 : colors.neutral200) : pressed ? colors.accent700 : colors.accent })}>
              <MessageCircleIcon size={18} color={isPaid ? colors.text : "#fff"} />
              <ThemedText variant="bodySemibold" color={isPaid ? colors.text : "#fff"}>Satıcıya Yaz</ThemedText>
            </Pressable>
          </View>
        )}

        <View style={{ backgroundColor: colors.card, marginTop: spacing.lg, padding: spacing.lg, gap: spacing.md, ...shadow.sm }}>
          <ThemedText variant="title" style={{ fontSize: 18 }}>Açıklama</ThemedText>
          <ThemedText variant="body" style={{ lineHeight: 22 }}>{store.content}</ThemedText>
          {store.book && (
            <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: store.book!.slug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.neutral200 : colors.neutral100 })}>
              <BookCover id={store.book.id} title={store.book.name} width={40} height={58} hasImage />
              <View style={{ flex: 1 }}>
                <ThemedText variant="label" color={colors.accent} style={{ fontSize: 10 }}>Katalogdaki kitap</ThemedText>
                <ThemedText variant="title" numberOfLines={2}>{store.book.name}</ThemedText>
              </View>
              <ChevronRightIcon size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.push({ pathname: "/profil/[username]", params: { username: store.ownerUsername } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm, padding: spacing.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
          <Avatar id={store.ownerId} name={store.ownerUsername} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="label" color={colors.textMuted} style={{ fontSize: 10 }}>Satıcı</ThemedText>
            <ThemedText variant="title">{store.ownerUsername}</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <StarIcon size={13} color={colors.accent} fill={store.ownerSellerScore != null ? colors.accent : "transparent"} />
              <ThemedText variant="caption" color={store.ownerSellerScore != null ? colors.accent700 : colors.textMuted} style={{ fontWeight: "600" }}>
                {store.ownerSellerScore != null ? `Satıcı puanı ${store.ownerSellerScore.toFixed(1)} (${store.ownerSellerRatingCount} değerlendirme)` : "Henüz satıcı puanı yok"}
              </ThemedText>
            </View>
          </View>
          <ChevronRightIcon size={18} color={colors.neutral400} />
        </Pressable>

        {!isOwner && (
          <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, gap: spacing.sm, ...shadow.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>Satıcıyı değerlendir</ThemedText>
              {myRatingOfSeller ? <ThemedText variant="bodySemibold" color={colors.accent700}>{myRatingOfSeller}/10</ThemedText> : null}
            </View>
            <ThemedText variant="caption" muted>Bu satıcıdan gerçekten kitap almış üyeler puan ve yorum bırakabilir.</ThemedText>
            <View style={{ flexDirection: "row", justifyContent: "space-between", opacity: ratingSaving ? 0.5 : 1 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const on = myRatingOfSeller != null && n <= myRatingOfSeller;
                return (
                  <Pressable key={n} disabled={ratingSaving} onPress={() => submitRating(n)} hitSlop={4}>
                    <StarIcon size={24} color={on ? colors.accent : colors.neutral400} fill={on ? colors.accent : "transparent"} strokeWidth={1.6} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, ...shadow.sm }}>
          <EntityCommentSection
            title="Satıcı yorumları"
            comments={sellerReviews}
            commentText={reviewText}
            onCommentTextChange={setReviewText}
            onSubmitComment={submitReview}
            submitting={reviewSaving}
            onReplied={load}
          />
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}
