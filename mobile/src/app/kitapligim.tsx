import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator, FlatList, RefreshControl, useWindowDimensions, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { getProfile, type ReadingGoal } from "@/api/profileOther";
import { showActionSheet } from "@/components/ActionSheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LayoutGridIcon, ListIcon, ArrowUpDownIcon, LibraryIcon, ScanBarcodeIcon, BookPlusIcon, TargetIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { HeaderBack } from "@/components/HeaderBack";
import { pickDropReason, type DropReason } from "@/lib/dropReason";
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
  const { profile } = useAuth();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);

  const load = useCallback(async () => {
    if (profile) {
      getProfile(profile.username)
        .then((p) => setGoal(p.readingGoal ?? null))
        .catch(() => {});
    }
    try {
      const result = await getLibrary();
      setLibrary(result);
      setError(null);
    } catch {
      setError("Kitaplığın yüklenemedi.");
    }
  }, [profile]);

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
    showActionSheet({
      title: book.name,
      message: "Bu kitabı hangi rafa taşımak istersin?",
      options: [
        ...others.map((t) => ({
          text: t.label,
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

  const gap = spacing.md;
  const tileWidth = Math.floor((width - spacing.lg * 2 - gap * 2) / 3);
  const coverWidth = tileWidth;
  const coverHeight = Math.round(coverWidth * 1.48);

  const goalPct = goal ? Math.min(1, goal.readCount / Math.max(1, goal.targetCount)) : 0;
  const openStats = () => profile && router.push({ pathname: "/profil/[username]", params: { username: profile.username, tab: "stats" } });

  const header = (
    <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
      {/* Shelves */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg }}>
        {TABS.map((t) => {
          const on = t.key === active;
          const n = library?.[t.key].length ?? 0;
          return (
            <Pressable key={t.key} onPress={() => setActive(t.key)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.text : colors.card, borderWidth: on ? 0 : StyleSheet.hairlineWidth, borderColor: colors.divider }}>
              <ThemedText variant="bodySemibold" color={on ? colors.card : colors.text} style={{ fontSize: 13.5 }}>{t.label}</ThemedText>
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: on ? "rgba(255,255,255,0.18)" : colors.neutral200 }}>
                <ThemedText variant="caption" color={on ? colors.card : colors.textMuted} style={{ fontSize: 11, fontWeight: "700" }}>{n}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Reading goal */}
      <Pressable onPress={openStats} style={({ pressed }) => ({ marginHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card })}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
          <TargetIcon size={20} color={colors.accent} />
        </View>
        {goal ? (
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <ThemedText variant="bodySemibold" style={{ fontSize: 14 }}>{goal.year} hedefi</ThemedText>
              <ThemedText variant="caption" muted><ThemedText variant="caption" style={{ fontWeight: "700" }}>{goal.readCount}</ThemedText> / {goal.targetCount} kitap</ThemedText>
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.neutral200, overflow: "hidden" }}>
              <View style={{ width: `${goalPct * 100}%`, height: 7, borderRadius: 4, backgroundColor: goalPct >= 1 ? "#3f8a5a" : colors.accent }} />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySemibold" style={{ fontSize: 14 }}>{new Date().getFullYear()} okuma hedefini belirle</ThemedText>
            <ThemedText variant="caption" muted>Toplam {total} kitap · istatistiklerini gör</ThemedText>
          </View>
        )}
        <ChevronRightIcon size={18} color={colors.neutral400} />
      </Pressable>

      {/* Search + sort + view */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Rafta ara" />
        </View>
        <Pressable onPress={cycleSort} hitSlop={4} accessibilityLabel={`Sırala: ${SORT_LABEL[sort]}`} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
          <ArrowUpDownIcon size={17} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setView((v) => (v === "grid" ? "list" : "grid"))} hitSlop={4} accessibilityLabel="Görünümü değiştir" style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}>
          {view === "grid" ? <ListIcon size={17} color={colors.text} /> : <LayoutGridIcon size={17} color={colors.text} />}
        </Pressable>
      </View>
      <ThemedText variant="caption" muted style={{ paddingHorizontal: spacing.lg, marginTop: -4 }}>
        {query ? `${items.length} sonuç` : `${items.length} kitap`} · {SORT_LABEL[sort]} · rafını değiştirmek için uzun bas
      </ThemedText>
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
        <HeaderBack />
        <ThemedText variant="display" style={{ flex: 1 }}>Kitaplığım</ThemedText>
        {[
          { key: "scan", Icon: ScanBarcodeIcon, label: "Barkod tara", onPress: () => router.push("/barkod") },
          { key: "add", Icon: BookPlusIcon, label: "Kitap ekle", onPress: () => router.push("/kitap/yeni") },
        ].map(({ key, Icon, label, onPress }) => (
          <Pressable key={key} onPress={onPress} hitSlop={6} accessibilityLabel={label} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: pressed ? colors.neutral200 : "transparent", alignItems: "center", justifyContent: "center" })}>
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
          numColumns={3}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
          columnWrapperStyle={{ gap, paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBook(item)}
              onLongPress={() => onLongPressBook(item)}
              style={({ pressed }) => ({ width: tileWidth, gap: 7, opacity: pressed ? 0.75 : 1 })}
            >
              <View style={{ borderRadius: 5, ...shadow.md }}>
                <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={coverWidth} height={coverHeight} hasImage={item.hasImage} />
              </View>
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
                paddingHorizontal: spacing.lg,
                paddingVertical: 10,
                backgroundColor: pressed ? colors.neutral200 : colors.card,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.divider,
              })}
            >
              <View style={{ borderRadius: 4, ...shadow.sm }}>
                <BookCover id={item.id} title={item.name} width={48} height={72} hasImage={item.hasImage} />
              </View>
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
