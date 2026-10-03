import { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from "react-native";
import { router, useNavigation, useFocusEffect } from "expo-router";
import { PlusIcon, MoreHorizontalIcon, TagIcon, XIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ListingThumb } from "@/components/ListingThumb";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { showActionSheet } from "@/components/ActionSheet";
import { getMyListings, setListingStatus, deleteListing, updateListingPrice, type MyStoreItem } from "@/api/store";

const STATUS: Record<string, { label: string; tone: "accent" | "green" | "muted" | "amber" }> = {
  pending: { label: "Onay bekliyor", tone: "amber" },
  active: { label: "Yayında", tone: "green" },
  completed: { label: "Verildi", tone: "muted" },
  cancelled: { label: "Yayından kaldırıldı", tone: "muted" },
};

type Filter = "all" | "active" | "pending" | "completed" | "cancelled";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Yayında" },
  { key: "pending", label: "Onay bekleyen" },
  { key: "completed", label: "Verilen" },
  { key: "cancelled", label: "Kaldırılan" },
];

/** İlanlarım - customer: "istenmeyen ilanları oradan sil, yayından kaldır,
 * güncelle" - every owner action is reachable right from the list. */
export default function IlanlarimScreen() {
  const { colors, spacing, radius, shadow, fontFamily } = useTheme();
  const navigation = useNavigation();
  const [listings, setListings] = useState<MyStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<MyStoreItem | null>(null);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [shipping, setShipping] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setListings((await getMyListings()).listings);
    } catch {
      // keep the current list
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/askida-kitap/yeni")} hitSlop={8} style={{ padding: 4 }}>
          <PlusIcon size={24} color={colors.accent} />
        </Pressable>
      ),
    });
  }, [navigation, colors.accent]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load]),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: listings.length };
    for (const l of listings) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [listings]);
  const visible = filter === "all" ? listings : listings.filter((l) => l.status === filter);

  async function changeStatus(item: MyStoreItem, status: "active" | "completed" | "cancelled") {
    const prev = listings;
    setListings((l) => l.map((x) => (x.id === item.id ? { ...x, status } : x)));
    try {
      await setListingStatus(item.id, status);
    } catch (err) {
      setListings(prev);
      Alert.alert("Güncellenemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
    }
  }

  function confirmDelete(item: MyStoreItem) {
    Alert.alert("İlan silinsin mi?", `"${item.title}" kalıcı olarak silinecek.`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteListing(item.id);
            setListings((l) => l.filter((x) => x.id !== item.id));
          } catch (err) {
            Alert.alert("Silinemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
          }
        },
      },
    ]);
  }

  function openEdit(item: MyStoreItem) {
    setPrice(item.price != null ? String(item.price) : "");
    setStock(item.stock != null ? String(item.stock) : "1");
    setShipping(item.shippingFee != null ? String(item.shippingFee) : "");
    setEditing(item);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const fields = { price: Number(price), stock: Number(stock), shippingFee: shipping.trim() ? Number(shipping) : null };
      await updateListingPrice(editing.id, fields);
      setListings((l) => l.map((x) => (x.id === editing.id ? { ...x, ...fields } : x)));
      setEditing(null);
    } catch (err) {
      Alert.alert("Kaydedilemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  function menu(item: MyStoreItem) {
    const paid = item.listingType === "paid";
    showActionSheet({
      title: item.title,
      options: [
        { text: "İlanı görüntüle", onPress: () => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } }) },
        ...(paid ? [{ text: "Fiyat / stok düzenle", onPress: () => openEdit(item) }] : []),
        ...(item.status === "active"
          ? [
              { text: paid ? "Satıldı olarak işaretle" : "Verildi olarak işaretle", onPress: () => void changeStatus(item, "completed") },
              { text: "Yayından kaldır", onPress: () => void changeStatus(item, "cancelled") },
            ]
          : item.status === "cancelled" || item.status === "completed"
            ? [{ text: "Yeniden yayına al", onPress: () => void changeStatus(item, "active") }]
            : []),
        { text: "İlanı sil", destructive: true, onPress: () => confirmDelete(item) },
      ],
    });
  }

  const toneColor = (tone: string) => (tone === "green" ? "#2f7a52" : tone === "amber" ? colors.accent700 : colors.textMuted);
  const toneBg = (tone: string) => (tone === "green" ? "#2f7a5222" : tone === "amber" ? colors.accent100 : colors.neutral200);
  const input = { height: 46, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg, paddingHorizontal: 12, fontSize: 16, fontFamily: fontFamily.bodyRegular, color: colors.text, backgroundColor: colors.neutral100 } as const;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, padding: spacing.lg, paddingBottom: spacing.sm, alignItems: "center" }}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={{ flexDirection: "row", gap: 5, paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200 }}>
              <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13 }}>{f.label}</ThemedText>
              {(counts[f.key] ?? 0) > 0 && <ThemedText variant="caption" color={on ? "rgba(255,255,255,0.85)" : colors.textMuted}>{counts[f.key]}</ThemedText>}
            </Pressable>
          );
        })}
      </ScrollView>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm, paddingBottom: spacing["3xl"] }}
        ListEmptyComponent={
          <EmptyState
            icon={<TagIcon size={30} color={colors.accent} />}
            title={filter === "all" ? "Henüz ilanın yok" : "Bu durumda ilan yok"}
            subtitle={filter === "all" ? "Okuduğun kitapları ücretsiz ya da ücretli olarak askıya bırak." : undefined}
            actionLabel={filter === "all" ? "İlan Ver" : undefined}
            onAction={() => router.push("/askida-kitap/yeni")}
          />
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? { label: item.status, tone: "muted" as const };
          return (
            <Pressable onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.slug } })} onLongPress={() => menu(item)} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, alignItems: "center", ...shadow.sm })}>
              <ListingThumb image={item.image} title={item.title} width={64} height={64} radius={8} />
              <View style={{ flex: 1, gap: 4 }}>
                <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 15 }}>{item.title}</ThemedText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: toneBg(st.tone) }}>
                    <ThemedText variant="caption" color={toneColor(st.tone)} style={{ fontWeight: "600", fontSize: 11 }}>{st.label}</ThemedText>
                  </View>
                  <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>
                    {item.listingType === "paid" && item.price ? `${item.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}
                  </ThemedText>
                </View>
              </View>
              <Pressable onPress={() => menu(item)} hitSlop={10} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                <MoreHorizontalIcon size={20} color={colors.textMuted} />
              </Pressable>
            </Pressable>
          );
        }}
      />

      <Modal visible={editing != null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.xl }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>Fiyat ve stok</ThemedText>
              <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                <XIcon size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ThemedText variant="caption" muted numberOfLines={2}>{editing?.title}</ThemedText>
            <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>Fiyat (₺)</ThemedText>
            <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={input} />
            <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>Stok</ThemedText>
            <TextInput value={stock} onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={input} />
            <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>Kargo ücreti (₺, boş = ücretsiz)</ThemedText>
            <TextInput value={shipping} onChangeText={(t) => setShipping(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" style={input} />
            <Pressable onPress={saveEdit} disabled={saving} style={({ pressed }) => ({ height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.accent700 : colors.accent })}>
              {saving ? <ActivityIndicator color="#fff" /> : <ThemedText variant="bodySemibold" color="#fff">Kaydet</ThemedText>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
