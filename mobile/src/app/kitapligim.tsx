import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator, FlatList, RefreshControl, Alert, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LayoutGridIcon, ListIcon, ArrowUpDownIcon, LibraryIcon, BookOpenIcon, CheckCircle2Icon, BookmarkIcon, PauseCircleIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getLibrary, setLibraryStatus, type LibraryByStatus, type LibraryBookItem, type ReadStatus } from "@/api/library";

const TABS: { key: ReadStatus; label: string }[] = [
  { key: "currentRead", label: "Okuyorum" },
  { key: "finishRead", label: "Okudum" },
  { key: "targetRead", label: "Okuyacağım" },
  { key: "dropRead", label: "Yarıda Bıraktım" },
];

const EMPTY_COPY: Record<ReadStatus, { title: string; subtitle: string }> = {
  currentRead: { title: "Şu an okuduğun kitap yok", subtitle: "Bir kitabın sayfasından “Okuyorum” diyerek buraya ekleyebilirsin." },
  finishRead: { title: "Henüz bitirdiğin kitap yok", subtitle: "Okuduğun kitapları işaretle, kitaplığın büyüdükçe rozet kazan." },
  targetRead: { title: "Okuma listen boş", subtitle: "Okumak istediğin kitapları kaydet, hiçbirini unutma." },
  dropRead: { title: "Yarıda bıraktığın kitap yok", subtitle: "Her kitap herkese göre değil — sorun yok." },
};

type SortMode = "recent" | "az" | "za";
const SORT_LABEL: Record<SortMode, string> = { recent: "Son eklenen", az: "A → Z", za: "Z → A" };

export default function KitapligimScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { width } = useWindowDimensions();
  const [library, setLibrary] = useState<LibraryByStatus | null>(null);
  const [active, setActive] = useState<ReadStatus>("currentRead");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");

  const load = useCallback(async () => {
    try {
      const result = await getLibrary();
      setLibrary(result);
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
    const base = library?.[active] ?? [];
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = q
      ? base.filter((b) => b.name.toLocaleLowerCase("tr-TR").includes(q) || b.writers.some((w) => w.toLocaleLowerCase("tr-TR").includes(q)))
      : base;
    if (sort === "recent") return filtered;
    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return sort === "az" ? sorted : sorted.reverse();
  }, [library, active, query, sort]);

  const total = library ? TABS.reduce((n, t) => n + library[t.key].length, 0) : 0;

  function cycleSort() {
    setSort((s) => (s === "recent" ? "az" : s === "az" ? "za" : "recent"));
  }

  function onLongPressBook(book: LibraryBookItem) {
    const others = TABS.filter((t) => t.key !== active);
    Alert.alert(book.name, "Bu kitabı hangi rafa taşımak istersin?", [
      ...others.map((t) => ({
        text: t.label,
        onPress: async () => {
          await setLibraryStatus(book.id, t.key);
          await load();
        },
      })),
      {
        text: "Kitaplıktan çıkar",
        style: "destructive" as const,
        onPress: async () => {
          await setLibraryStatus(book.id, null);
          await load();
        },
      },
      { text: "Vazgeç", style: "cancel" as const },
    ]);
  }

  const openBook = (b: LibraryBookItem) => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } });

  const gap = spacing.md;
  const tileWidth = Math.floor((width - spacing.lg * 2 - gap * 2) / 3);
  const coverWidth = tileWidth - spacing.sm * 2;
  const coverHeight = Math.round(coverWidth * 1.48);

  const stats = [
    { key: "currentRead" as const, icon: BookOpenIcon, label: "Okuyor" },
    { key: "finishRead" as const, icon: CheckCircle2Icon, label: "Okudu" },
    { key: "targetRead" as const, icon: BookmarkIcon, label: "Okuyacak" },
    { key: "dropRead" as const, icon: PauseCircleIcon, label: "Bıraktı" },
  ];

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      <View style={{ marginHorizontal: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.md, ...shadow.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
            <LibraryIcon size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="title">Toplam {total} kitap</ThemedText>
            <ThemedText variant="caption" muted>Bir rafa dokunarak kitaplarını gör</ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {stats.map((s) => {
            const Icon = s.icon;
            const isActive = s.key === active;
            return (
              <Pressable
                key={s.key}
                onPress={() => setActive(s.key)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  gap: 2,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.lg,
                  borderWidth: 1.5,
                  borderColor: isActive ? colors.accent : "transparent",
                  backgroundColor: isActive ? colors.accent100 : colors.neutral100,
                }}
              >
                <Icon size={16} color={isActive ? colors.accent : colors.textMuted} />
                <ThemedText variant="title" color={isActive ? colors.accent : colors.text} style={{ fontSize: 20 }}>
                  {library?.[s.key].length ?? 0}
                </ThemedText>
                <ThemedText variant="caption" muted>{s.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Kitaplığında ara (ad, yazar)" />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <ThemedText variant="title" style={{ fontSize: 18 }}>{TABS.find((t) => t.key === active)?.label}</ThemedText>
          <ThemedText variant="caption" muted>
            {query ? `${items.length} sonuç` : `${items.length} kitap`} · taşımak için uzun bas
          </ThemedText>
        </View>
        <Pressable onPress={cycleSort} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.neutral200 }}>
          <ArrowUpDownIcon size={13} color={colors.text} />
          <ThemedText variant="caption" style={{ fontWeight: "600" }}>{SORT_LABEL[sort]}</ThemedText>
        </Pressable>
        <View style={{ flexDirection: "row", marginLeft: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.neutral200, padding: 2 }}>
          {(["grid", "list"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGridIcon : ListIcon;
            const on = view === v;
            return (
              <Pressable key={v} onPress={() => setView(v)} style={{ paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.pill, backgroundColor: on ? colors.card : "transparent" }}>
                <Icon size={15} color={on ? colors.accent : colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
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

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
        <ThemedText variant="display">Kitaplığım</ThemedText>
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
          numColumns={3}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
          columnWrapperStyle={{ gap, paddingHorizontal: spacing.lg, marginBottom: gap }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBook(item)}
              onLongPress={() => onLongPressBook(item)}
              style={({ pressed }) => ({
                width: tileWidth,
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.divider,
                padding: spacing.sm,
                gap: 6,
                opacity: pressed ? 0.85 : 1,
                ...shadow.sm,
              })}
            >
              <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={coverWidth} height={coverHeight} hasImage={item.hasImage} />
              <View style={{ minHeight: 44 }}>
                <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>
                  {item.name}
                </ThemedText>
                {item.writers.length > 0 && (
                  <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: 1 }}>
                    {item.writers.join(", ")}
                  </ThemedText>
                )}
              </View>
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
          contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBook(item)}
              onLongPress={() => onLongPressBook(item)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                marginHorizontal: spacing.lg,
                marginBottom: spacing.sm,
                padding: spacing.sm,
                backgroundColor: pressed ? colors.neutral100 : colors.card,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.divider,
                ...shadow.sm,
              })}
            >
              <BookCover id={item.id} title={item.name} width={48} height={70} hasImage={item.hasImage} />
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText variant="title" numberOfLines={2}>{item.name}</ThemedText>
                <ThemedText variant="caption" muted numberOfLines={1}>{item.writers.join(", ") || "Yazar bilinmiyor"}</ThemedText>
              </View>
              <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
                <ThemedText variant="caption" color={colors.accent700} style={{ fontSize: 11 }}>
                  {TABS.find((t) => t.key === active)?.label}
                </ThemedText>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
