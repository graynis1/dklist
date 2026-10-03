import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator, FlatList, RefreshControl, useWindowDimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LayoutGridIcon, ListIcon, LibraryIcon, ScanBarcodeIcon, BookPlusIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { HeaderBack } from "@/components/HeaderBack";
import { showActionSheet } from "@/components/ActionSheet";
import { pickDropReason, type DropReason } from "@/lib/dropReason";
import { getLibrary, setLibraryStatus, getOwnedBooks, toggleOwnedBook, type LibraryByStatus, type LibraryBookItem, type ReadStatus } from "@/api/library";

type ShelfKey = ReadStatus | "owned";

const SHELVES: { key: ShelfKey; label: string; long: string }[] = [
  { key: "currentRead", label: "Okuyorum", long: "Okuyorum" },
  { key: "finishRead", label: "Okudum", long: "Okudum" },
  { key: "targetRead", label: "Okuyacağım", long: "Okuyacağım" },
  { key: "dropRead", label: "Bıraktım", long: "Yarıda Bıraktım" },
  { key: "owned", label: "Kütüphane", long: "Kütüphanem" },
];

const READ_SHELVES = SHELVES.filter((s): s is { key: ReadStatus; label: string; long: string } => s.key !== "owned");

const EMPTY_COPY: Record<ShelfKey, { title: string; subtitle: string }> = {
  owned: { title: "Kütüphanen boş", subtitle: "Evindeki kitapları ekle: barkodunu tara ya da kitap sayfasındaki kütüphane düğmesine dokun." },
  currentRead: { title: "Şu an okuduğun kitap yok", subtitle: "Bir kitabın sayfasından “Okuyorum” diyerek buraya ekleyebilirsin." },
  finishRead: { title: "Henüz bitirdiğin kitap yok", subtitle: "Okuduğun kitapları işaretle, kitaplığın büyüdükçe rozet kazan." },
  targetRead: { title: "Okuma listen boş", subtitle: "Okumak istediğin kitapları kaydet, hiçbirini unutma." },
  dropRead: { title: "Yarıda bıraktığın kitap yok", subtitle: "Her kitap herkese göre değil — sorun yok." },
};

type SortMode = "recent" | "az" | "za";
const SORT_LABEL: Record<SortMode, string> = { recent: "Son eklenen", az: "Ada göre (A-Z)", za: "Ada göre (Z-A)" };

const COLUMNS = 3;
const GAP = 14;

export default function KitapligimScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const [library, setLibrary] = useState<LibraryByStatus | null>(null);
  const [active, setActive] = useState<ShelfKey>("currentRead");
  const [owned, setOwned] = useState<LibraryBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const load = useCallback(async () => {
    try {
      const [lib, own] = await Promise.all([getLibrary(), getOwnedBooks().catch(() => [] as LibraryBookItem[])]);
      setLibrary(lib);
      setOwned(own);
      setError(null);
    } catch {
      setError("Kitaplığın yüklenemedi.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  // Coming back from a book page where the shelf was changed should show it.
  useFocusEffect(
    useCallback(() => {
      if (library) load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const items = useMemo(() => {
    const base = active === "owned" ? owned : (library?.[active] ?? []);
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = q
      ? base.filter((b) => b.name.toLocaleLowerCase("tr-TR").includes(q) || b.writers.some((w) => w.toLocaleLowerCase("tr-TR").includes(q)))
      : base;
    if (sort === "recent") return filtered;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return sort === "az" ? sorted : sorted.reverse();
  }, [library, owned, active, query, sort]);

  function openSortSheet() {
    showActionSheet({
      title: "Sırala",
      options: (Object.keys(SORT_LABEL) as SortMode[]).map((k) => ({ text: (sort === k ? "✓ " : "") + SORT_LABEL[k], onPress: () => setSort(k) })),
    });
  }

  function onLongPressBook(book: LibraryBookItem) {
    if (active === "owned") {
      showActionSheet({
        title: book.name,
        options: [
          { text: "Kitabı aç", onPress: () => openBook(book) },
          {
            text: "Kütüphanemden çıkar",
            destructive: true,
            onPress: async () => {
              await toggleOwnedBook(book.id);
              await load();
            },
          },
        ],
      });
      return;
    }
    showActionSheet({
      title: book.name,
      message: "Rafını değiştir",
      options: [
        ...READ_SHELVES.filter((t) => t.key !== active).map((t) => ({
          text: t.long,
          onPress: () => {
            const move = async (reason?: DropReason) => {
              await setLibraryStatus(book.id, t.key, reason);
              await load();
            };
            if (t.key === "dropRead") pickDropReason((r) => void move(r));
            else void move();
          },
        })),
        {
          text: "Kitaplıktan çıkar",
          destructive: true,
          onPress: async () => {
            await setLibraryStatus(book.id, null);
            await load();
          },
        },
      ],
    });
  }

  const openBook = (b: LibraryBookItem) => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } });

  const tileWidth = Math.floor((width - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const coverHeight = Math.round(tileWidth * 1.5);

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      {/* Shelf picker - native-style segmented control */}
      <View style={{ marginHorizontal: spacing.lg, flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: colors.neutral200 }}>
        {SHELVES.map((s) => {
          const on = s.key === active;
          const n = s.key === "owned" ? owned.length : (library?.[s.key].length ?? 0);
          return (
            <Pressable
              key={s.key}
              onPress={() => setActive(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 11, backgroundColor: on ? colors.card : "transparent", ...(on ? shadow.sm : null) }}
            >
              <ThemedText variant="title" color={on ? colors.accent700 : colors.text} style={{ fontSize: 18, lineHeight: 22 }}>{n}</ThemedText>
              <ThemedText variant="caption" color={on ? colors.text : colors.textMuted} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: on ? "600" : "500" }}>{s.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {active === "owned" && (
        <Pressable onPress={() => router.push("/barkod")} style={({ pressed }) => ({ marginHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent200 : colors.accent100 })}>
          <ScanBarcodeIcon size={22} color={colors.accent800} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySemibold" color={colors.accent800}>Barkod tarayarak ekle</ThemedText>
            <ThemedText variant="caption" color={colors.accent700}>Kitabın arkasındaki ISBN&apos;i okut, kütüphanene ekle</ThemedText>
          </View>
          <ChevronRightIcon size={18} color={colors.accent700} />
        </Pressable>
      )}

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Kitaplığında ara (ad, yazar)" />
      </View>

      {/* Toolbar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, minHeight: 32 }}>
        <ThemedText variant="body" muted style={{ flex: 1, fontSize: 14 }}>
          {query ? `${items.length} sonuç` : `${items.length} kitap`}
        </ThemedText>
        <Pressable onPress={openSortSheet} hitSlop={8} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 6, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
          <ThemedText variant="body" style={{ fontSize: 14, fontWeight: "600" }}>{SORT_LABEL[sort]}</ThemedText>
          <ChevronDownIcon size={16} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => setView((v) => (v === "grid" ? "list" : "grid"))}
          hitSlop={8}
          accessibilityLabel={view === "grid" ? "Liste görünümü" : "Izgara görünümü"}
          style={({ pressed }) => ({ marginLeft: 4, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}
        >
          {view === "grid" ? <ListIcon size={20} color={colors.text} /> : <LayoutGridIcon size={19} color={colors.text} />}
        </Pressable>
      </View>
    </View>
  );

  const empty = query ? (
    <EmptyState icon={<LibraryIcon size={32} color={colors.accent} />} title="Sonuç yok" subtitle={`“${query}” bu rafta bulunamadı.`} />
  ) : (
    <EmptyState
      icon={<LibraryIcon size={32} color={colors.accent} />}
      title={EMPTY_COPY[active].title}
      subtitle={EMPTY_COPY[active].subtitle}
      actionLabel="Kitap Keşfet"
      onAction={() => router.replace("/kesfet")}
    />
  );

  const footer =
    items.length > 0 ? (
      <ThemedText variant="caption" muted style={{ textAlign: "center", paddingTop: spacing.lg }}>
        Rafını değiştirmek için bir kitaba uzun bas
      </ThemedText>
    ) : null;

  const refresh = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.sm, height: 56 }}>
        <HeaderBack />
        <ThemedText variant="display" style={{ flex: 1 }}>Kitaplığım</ThemedText>
        {[
          { key: "scan", Icon: ScanBarcodeIcon, label: "Barkod tara", onPress: () => router.push("/barkod") },
          { key: "add", Icon: BookPlusIcon, label: "Kitap ekle", onPress: () => router.push("/kitap/yeni") },
        ].map(({ key, Icon, label, onPress }) => (
          <Pressable key={key} onPress={onPress} hitSlop={6} accessibilityLabel={label} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
            <Icon size={23} color={colors.text} />
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <EmptyState icon={<LibraryIcon size={32} color={colors.accent} />} title="Bir sorun oluştu" subtitle={error} actionLabel="Tekrar Dene" onAction={onRefresh} />
      ) : view === "grid" ? (
        <FlatList
          key="grid"
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLUMNS}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingTop: spacing.xs, paddingBottom: spacing["3xl"] }}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh}
          renderItem={({ item }) => (
            <Pressable onPress={() => openBook(item)} onLongPress={() => onLongPressBook(item)} style={({ pressed }) => ({ width: tileWidth, opacity: pressed ? 0.75 : 1 })}>
              <View style={{ borderRadius: 6, backgroundColor: colors.card, ...shadow.md }}>
                <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={tileWidth} height={coverHeight} hasImage={item.hasImage} />
              </View>
              <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 13, lineHeight: 17, marginTop: 8 }}>
                {item.name}
              </ThemedText>
              {item.writers.length > 0 && (
                <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 12, marginTop: 2 }}>
                  {item.writers.join(", ")}
                </ThemedText>
              )}
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          key="list"
          data={items}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingTop: spacing.xs, paddingBottom: spacing["3xl"] }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh}
          renderItem={({ item, index }) => {
            const first = index === 0;
            const last = index === items.length - 1;
            return (
              <Pressable
                onPress={() => openBook(item)}
                onLongPress={() => onLongPressBook(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  marginHorizontal: spacing.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 10,
                  backgroundColor: pressed ? colors.neutral100 : colors.card,
                  borderTopLeftRadius: first ? radius.lg : 0,
                  borderTopRightRadius: first ? radius.lg : 0,
                  borderBottomLeftRadius: last ? radius.lg : 0,
                  borderBottomRightRadius: last ? radius.lg : 0,
                  borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: colors.divider,
                })}
              >
                <View style={{ borderRadius: 4, ...shadow.sm }}>
                  <BookCover id={item.id} title={item.name} width={50} height={75} hasImage={item.hasImage} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 15.5 }}>{item.name}</ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 13 }}>{item.writers.join(", ") || "Yazar bilinmiyor"}</ThemedText>
                </View>
                <ChevronRightIcon size={18} color={colors.neutral400} />
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
