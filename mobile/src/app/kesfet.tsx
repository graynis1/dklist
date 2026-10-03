import { useCallback, useEffect, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { View, ScrollView, Pressable, ActivityIndicator, Image, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import {
  SearchIcon,
  NewspaperIcon,
  PlayCircleIcon,
  UsersIcon,
  LibraryBigIcon,
  ListIcon,
  CalendarHeartIcon,
  PlayIcon,
  AwardIcon,
  TrophyIcon,
  GiftIcon,
  SparklesIcon,
  ChevronRightIcon,
  TagIcon,
  FeatherIcon,
  ScanBarcodeIcon,
  BookPlusIcon,
  HistoryIcon,
  XIcon,
  StarIcon,
  MapPinIcon,
  BookOpenIcon,
  CrownIcon,
} from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ListingThumb } from "@/components/ListingThumb";
import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { IconTile } from "@/components/ui";
import { HeaderBack } from "@/components/HeaderBack";
import { search as searchApi, type SearchResults } from "@/api/search";
import { getCategories, getCategory, type TopCategory, type CategoryBookItem } from "@/api/category";
import { getLeaderboard, type LeaderboardEntry, type UserWeeklyRank } from "@/api/community";
import { getClubList, type ClubListItem } from "@/api/clubs";
import { getStoreList, type StoreListItem } from "@/api/store";
import { getBlogList, getVideoList, type BlogListItem, type VideoListItem } from "@/api/content";
import { getRecommendations, getBookOfMonth, getPublicLists, type BookListItem, type ReaderSuggestion, type BookOfMonthEntry, type PublicList } from "@/api/discover";
import { videoThumb } from "@/lib/videoThumb";
import { useAuth } from "@/auth/AuthContext";

const QUICK: { icon: typeof FeatherIcon; label: string; href: Href }[] = [
  { icon: FeatherIcon, label: "Yazarhane", href: "/yazarhane" },
  { icon: ScanBarcodeIcon, label: "Barkod", href: "/barkod" },
  { icon: BookPlusIcon, label: "Kitap Ekle", href: "/kitap/yeni" },
  { icon: TagIcon, label: "Askıda Kitap", href: "/askida-kitap" },
  { icon: UsersIcon, label: "Kulüpler", href: "/kulupler" },
  { icon: NewspaperIcon, label: "Bloglar", href: "/bloglar" },
  { icon: PlayCircleIcon, label: "Videolar", href: "/videolar" },
  { icon: LibraryBigIcon, label: "Kitaplar", href: "/kitaplar" },
];

const RECENT_KEY = "kesfet_recent_searches";

type ResultTab = "all" | "books" | "writers" | "translators" | "publishers" | "users";

const blogImg = (img: string | null) => mediaUrl(img);

function Section({ title, action, onAction, children, padded = true }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode; padded?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, paddingVertical: spacing.md, marginBottom: 8, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg }}>
        <ThemedText variant="title" style={{ flex: 1, fontSize: 18 }}>{title}</ThemedText>
        {action && onAction && (
          <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <ThemedText variant="bodySemibold" color={colors.accent} style={{ fontSize: 13.5 }}>{action}</ThemedText>
            <ChevronRightIcon size={16} color={colors.accent} />
          </Pressable>
        )}
      </View>
      <View style={padded ? { paddingHorizontal: spacing.lg } : undefined}>{children}</View>
    </View>
  );
}

function Row({ left, title, subtitle, onPress }: { left: React.ReactNode; title: string; subtitle?: string; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 9, paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
      {left}
      <View style={{ flex: 1 }}>
        <ThemedText variant="bodySemibold" numberOfLines={1}>{title}</ThemedText>
        {subtitle ? <ThemedText variant="caption" muted numberOfLines={1}>{subtitle}</ThemedText> : null}
      </View>
      <ChevronRightIcon size={17} color={colors.neutral400} />
    </Pressable>
  );
}

function IconBubble({ icon: Icon, size = 44 }: { icon: typeof FeatherIcon; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
      <Icon size={size * 0.45} color={colors.accent} />
    </View>
  );
}

export default function KesfetScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<ResultTab>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<TopCategory[]>([]);
  const [shelf, setShelf] = useState<{ category: TopCategory; items: CategoryBookItem[] } | null>(null);
  const [leaders, setLeaders] = useState<{ list: LeaderboardEntry[]; me: UserWeeklyRank | null } | null>(null);
  const [clubs, setClubs] = useState<ClubListItem[]>([]);
  const [listings, setListings] = useState<StoreListItem[]>([]);
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [recs, setRecs] = useState<{ personalized: boolean; books: BookListItem[]; readers: ReaderSuggestion[] } | null>(null);
  const [botm, setBotm] = useState<BookOfMonthEntry | null>(null);
  const [lists, setLists] = useState<PublicList[]>([]);
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const loadDiscovery = useCallback(async () => {
    const [cats, lb, cl, st, bl, vd, rc, bm, ls] = await Promise.allSettled([
      getCategories(),
      getLeaderboard(),
      getClubList(),
      getStoreList(),
      getBlogList(1),
      getVideoList(1),
      getRecommendations(),
      getBookOfMonth(),
      getPublicLists(),
    ]);
    if (vd.status === "fulfilled") setVideos(vd.value.items.slice(0, 8));
    if (rc.status === "fulfilled") setRecs({ personalized: rc.value.personalized, books: rc.value.books.slice(0, 12), readers: rc.value.readers.slice(0, 10) });
    if (bm.status === "fulfilled") setBotm(bm.value.current);
    if (ls.status === "fulfilled") setLists(ls.value.lists.slice(0, 6));
    if (cats.status === "fulfilled") {
      setCategories(cats.value.categories);
      const top = cats.value.categories[0];
      if (top) {
        getCategory(top.slug, 1, "viewCount")
          .then((r) => setShelf({ category: top, items: r.items.slice(0, 12) }))
          .catch(() => {});
      }
    }
    if (lb.status === "fulfilled") setLeaders({ list: lb.value.leaderboard, me: lb.value.myRank });
    if (cl.status === "fulfilled") setClubs(cl.value.items.slice(0, 8));
    if (st.status === "fulfilled") setListings(st.value.items.slice(0, 8));
    if (bl.status === "fulfilled") setBlogs(bl.value.items.slice(0, 3));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDiscovery();
    SecureStore.getItemAsync(RECENT_KEY)
      .then((v) => v && setRecent(JSON.parse(v)))
      .catch(() => {});
  }, [loadDiscovery]);

  function saveRecent(term: string) {
    const t = term.trim();
    if (t.length < 2) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x.toLocaleLowerCase("tr-TR") !== t.toLocaleLowerCase("tr-TR"))].slice(0, 8);
      SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    SecureStore.deleteItemAsync(RECENT_KEY).catch(() => {});
  }

  function removeRecent(term: string) {
    setRecent((prev) => {
      const next = prev.filter((x) => x !== term);
      SecureStore.setItemAsync(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // Clearing stale results when the query shrinks is a synchronous reset, not a fetch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchApi(query));
      } catch {
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function open(href: Href) {
    saveRecent(query);
    router.push(href);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDiscovery();
    setRefreshing(false);
  }

  const searchMode = focused || query.trim().length > 0;
  const counts = results
    ? { books: results.books.length, writers: results.writers.length, translators: results.translators.length, publishers: results.publishers.length, users: results.users.length }
    : null;
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const show = (t: ResultTab) => tab === "all" || tab === t;
  const limit = (t: ResultTab) => (tab === "all" ? (t === "books" ? 5 : 3) : 50);

  const TABS: { key: ResultTab; label: string; n?: number }[] = [
    { key: "all", label: "Tümü", n: total },
    { key: "books", label: "Kitaplar", n: counts?.books },
    { key: "writers", label: "Yazarlar", n: counts?.writers },
    { key: "users", label: "Kişiler", n: counts?.users },
    { key: "publishers", label: "Yayınevleri", n: counts?.publishers },
    { key: "translators", label: "Çevirmenler", n: counts?.translators },
  ];

  const moreLink = (t: ResultTab, n: number) =>
    tab === "all" && n > limit(t) ? (
      <Pressable onPress={() => setTab(t)} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <ThemedText variant="bodySemibold" color={colors.accent} style={{ fontSize: 13.5 }}>Tümünü gör ({n})</ThemedText>
      </Pressable>
    ) : null;

  const groupTitle = (label: string) => (
    <ThemedText variant="label" color={colors.textMuted} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 4 }}>
      {label}
    </ThemedText>
  );

  const podium = leaders?.list.slice(0, 3) ?? [];
  const medal = ["#c9a227", "#9ea3a8", "#b0703c"];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.sm, backgroundColor: colors.card, borderBottomWidth: searchMode ? 1 : 0, borderBottomColor: colors.divider }}>
        {!searchMode && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <HeaderBack />
            <ThemedText variant="display">Keşfet</ThemedText>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChangeText={(v) => {
                setQuery(v);
                setTab("all");
              }}
              placeholder="Kitap, yazar, yayınevi, kullanıcı…"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused(true)}
              onSubmitEditing={() => saveRecent(query)}
            />
          </View>
          {searchMode ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setFocused(false);
              }}
              hitSlop={8}
            >
              <ThemedText variant="bodySemibold" color={colors.accent}>Vazgeç</ThemedText>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push("/barkod")} hitSlop={6} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: pressed ? colors.accent700 : colors.accent, alignItems: "center", justifyContent: "center" })}>
              <ScanBarcodeIcon size={20} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>

      {searchMode ? (
        <View style={{ flex: 1, backgroundColor: colors.card }}>
          {query.trim().length < 2 ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: spacing.sm }}>
              {recent.length > 0 ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
                    <ThemedText variant="title" style={{ flex: 1 }}>Son aramalar</ThemedText>
                    <ThemedText variant="bodySemibold" color={colors.accent} style={{ fontSize: 13.5 }} onPress={clearRecent}>Temizle</ThemedText>
                  </View>
                  {recent.map((r) => (
                    <Pressable key={r} onPress={() => setQuery(r)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10, paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral200, alignItems: "center", justifyContent: "center" }}>
                        <HistoryIcon size={17} color={colors.textMuted} />
                      </View>
                      <ThemedText variant="body" style={{ flex: 1 }}>{r}</ThemedText>
                      <Pressable onPress={() => removeRecent(r)} hitSlop={10}>
                        <XIcon size={17} color={colors.neutral500} />
                      </Pressable>
                    </Pressable>
                  ))}
                </>
              ) : (
                <EmptyState icon={<SearchIcon size={30} color={colors.accent} />} title="Ne arıyorsun?" subtitle="Kitap, yazar, çevirmen, yayınevi ya da okur adı yaz. Kitabın barkodunu da tarayabilirsin." actionLabel="Barkod Tara" onAction={() => router.push("/barkod")} />
              )}
            </ScrollView>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: "center" }}>
                {TABS.filter((t) => t.key === "all" || (t.n ?? 0) > 0).map((t) => {
                  const on = tab === t.key;
                  return (
                    <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.neutral200 }}>
                      <ThemedText variant="bodySemibold" color={on ? "#fff" : colors.text} style={{ fontSize: 13.5 }}>{t.label}</ThemedText>
                      {t.n != null && t.n > 0 && <ThemedText variant="caption" color={on ? "rgba(255,255,255,0.85)" : colors.textMuted}>{t.n}</ThemedText>}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing["3xl"] }}>
                {searching && !results ? (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
                ) : results && total === 0 ? (
                  <EmptyState icon={<SearchIcon size={30} color={colors.accent} />} title="Sonuç bulunamadı" subtitle={`“${query}” için bir şey bulamadık. Kitap kataloğumuzda yoksa ekleyebilirsin.`} actionLabel="Kitap Ekle" onAction={() => router.push({ pathname: "/kitap/yeni", params: { name: query } })} />
                ) : results ? (
                  <>
                    {show("books") && results.books.length > 0 && (
                      <View>
                        {groupTitle("Kitaplar")}
                        {results.books.slice(0, limit("books")).map((b) => (
                          <Pressable key={b.id} onPress={() => open({ pathname: "/kitap/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 8, paddingHorizontal: spacing.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}>
                            <BookCover id={b.id} title={b.name} width={44} height={64} hasImage={b.hasImage} score={b.score} />
                            <View style={{ flex: 1, gap: 2 }}>
                              <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 15.5 }}>{b.name}</ThemedText>
                              <ThemedText variant="caption" muted numberOfLines={1}>{b.writers.join(", ") || "Yazar bilinmiyor"}</ThemedText>
                              {b.score > 0 && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                                  <StarIcon size={11} color={colors.accent} fill={colors.accent} />
                                  <ThemedText variant="caption" color={colors.accent700}>{b.score.toFixed(1)}</ThemedText>
                                </View>
                              )}
                            </View>
                          </Pressable>
                        ))}
                        {moreLink("books", results.books.length)}
                      </View>
                    )}
                    {show("writers") && results.writers.length > 0 && (
                      <View>
                        {groupTitle("Yazarlar")}
                        {results.writers.slice(0, limit("writers")).map((w) => (
                          <Row key={w.id} left={<Avatar id={w.id} name={w.name} size={44} />} title={w.name} subtitle="Yazar" onPress={() => open({ pathname: "/yazar/[slug]", params: { slug: w.slug } })} />
                        ))}
                        {moreLink("writers", results.writers.length)}
                      </View>
                    )}
                    {show("users") && results.users.length > 0 && (
                      <View>
                        {groupTitle("Kişiler")}
                        {results.users.slice(0, limit("users")).map((u) => (
                          <Row key={u.id} left={<Avatar id={u.id} name={u.username} imageUrl={u.image} size={44} />} title={`@${u.username}`} subtitle="Okur" onPress={() => open({ pathname: "/profil/[username]", params: { username: u.username } })} />
                        ))}
                        {moreLink("users", results.users.length)}
                      </View>
                    )}
                    {show("publishers") && results.publishers.length > 0 && (
                      <View>
                        {groupTitle("Yayınevleri")}
                        {results.publishers.slice(0, limit("publishers")).map((p) => (
                          <Row key={p.id} left={<IconBubble icon={BookOpenIcon} />} title={p.name} subtitle="Yayınevi" onPress={() => open({ pathname: "/yayinevi/[slug]", params: { slug: p.slug } })} />
                        ))}
                        {moreLink("publishers", results.publishers.length)}
                      </View>
                    )}
                    {show("translators") && results.translators.length > 0 && (
                      <View>
                        {groupTitle("Çevirmenler")}
                        {results.translators.slice(0, limit("translators")).map((t) => (
                          <Row key={t.id} left={<IconBubble icon={FeatherIcon} />} title={t.name} subtitle="Çevirmen" onPress={() => open({ pathname: "/cevirmen/[slug]", params: { slug: t.slug } })} />
                        ))}
                        {moreLink("translators", results.translators.length)}
                      </View>
                    )}
                  </>
                ) : null}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing["3xl"] }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
          <View style={{ backgroundColor: colors.card, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm, marginBottom: 8, flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md }}>
            {QUICK.map((q) => (
              <Pressable key={q.label} onPress={() => router.push(q.href)} style={({ pressed }) => ({ width: "25%", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}>
                <IconTile icon={q.icon} size={50} tone="accent" />
                <ThemedText variant="caption" numberOfLines={1} style={{ fontSize: 12, fontWeight: "500" }}>{q.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          {botm && (
            <Pressable onPress={() => router.push("/ayin-kitabi")} style={({ pressed }) => ({ marginBottom: 8, opacity: pressed ? 0.9 : 1 })}>
              <LinearGradient colors={["#3b2a1a", colors.accent700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", gap: spacing.lg, padding: spacing.lg, alignItems: "center" }}>
                <View style={{ borderRadius: 5, ...shadow.md }}>
                  <BookCover id={botm.bookId} title={botm.bookName} width={72} height={106} hasImage={botm.hasImage} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <CalendarHeartIcon size={14} color="rgba(255,255,255,0.85)" />
                    <ThemedText variant="label" color="rgba(255,255,255,0.85)">AYIN KİTABI · {botm.periodLabel}</ThemedText>
                  </View>
                  <ThemedText variant="title" color="#fff" numberOfLines={2} style={{ fontSize: 18 }}>{botm.bookName}</ThemedText>
                  <ThemedText variant="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>{botm.writers.join(", ")}</ThemedText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <View style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.18)" }}>
                      <ThemedText variant="caption" color="#fff" style={{ fontWeight: "700" }}>Birlikte oku</ThemedText>
                    </View>
                    <ThemedText variant="caption" color="rgba(255,255,255,0.8)">{botm.participantCount} katılımcı</ThemedText>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {recs && recs.books.length > 0 && (
            <Section title={recs.personalized ? "Senin için" : "Okurların favorileri"} action="Daha fazla" onAction={() => router.push("/kitaplar")} padded={false}>
              {recs.personalized && (
                <ThemedText variant="caption" muted style={{ paddingHorizontal: spacing.lg, marginTop: -6 }}>Okuduğun kitaplara göre seçtik</ThemedText>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
                {recs.books.map((b) => (
                  <Pressable key={b.id} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ width: 104, gap: 6, opacity: pressed ? 0.8 : 1 })}>
                    <View style={{ borderRadius: 5, ...shadow.md }}>
                      <BookCover id={b.id} title={b.name} author={b.writers.join(", ")} width={104} height={154} hasImage={b.hasImage} score={b.score} />
                    </View>
                    <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{b.name}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: -4 }}>{b.writers.join(", ")}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {categories.length > 0 && (
            <Section title="Kategoriler" action="Tümü" onAction={() => router.push("/kategoriler")} padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.lg }}>
                {categories.slice(0, 14).map((c) => (
                  <Pressable key={c.id} onPress={() => router.push({ pathname: "/kategori/[slug]", params: { slug: c.slug } })} style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.accent200 : colors.accent100 })}>
                    <ThemedText variant="bodySemibold" color={colors.accent800} style={{ fontSize: 13.5 }}>{c.name}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {shelf && shelf.items.length > 0 && (
            <Section title={`Popüler: ${shelf.category.name}`} action="Tümü" onAction={() => router.push({ pathname: "/kategori/[slug]", params: { slug: shelf.category.slug } })} padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
                {shelf.items.map((b, i) => (
                  <Pressable key={b.id} onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ width: 110, gap: 6, opacity: pressed ? 0.8 : 1 })}>
                    <View style={{ borderRadius: 5, ...shadow.md }}>
                      <BookCover id={b.id} title={b.name} author={b.writers.join(", ")} width={110} height={163} hasImage={b.hasImage} score={b.score} />
                      <View style={{ position: "absolute", left: -4, top: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" }}>
                        <ThemedText variant="caption" color="#fff" style={{ fontWeight: "700", fontSize: 11 }}>{i + 1}</ThemedText>
                      </View>
                    </View>
                    <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 12.5, lineHeight: 16 }}>{b.name}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11, marginTop: -4 }}>{b.writers.join(", ")}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {profile && recs && recs.readers.length > 0 && (
            <Section title="Seninle aynı kitapları okuyanlar" padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {recs.readers.map((r) => (
                  <Pressable key={r.id} onPress={() => router.push({ pathname: "/profil/[username]", params: { username: r.username } })} style={({ pressed }) => ({ width: 128, alignItems: "center", gap: 6, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: pressed ? colors.neutral100 : colors.card })}>
                    <Avatar id={r.id} name={r.username} imageUrl={r.image} size={60} />
                    <ThemedText variant="bodySemibold" numberOfLines={1} style={{ fontSize: 13.5 }}>{r.username}</ThemedText>
                    <ThemedText variant="caption" muted numberOfLines={1}>{r.sharedBookCount} ortak kitap</ThemedText>
                    <View style={{ alignSelf: "stretch", alignItems: "center", paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.accent100 }}>
                      <ThemedText variant="caption" color={colors.accent800} style={{ fontWeight: "700" }}>Profili gör</ThemedText>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {podium.length > 0 && (
            <Section title="Haftanın okurları" action="Tablo" onAction={() => router.push("/puan-tablosu")}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: spacing.sm }}>
                {[podium[1], podium[0], podium[2]].map((p, idx) => {
                  if (!p) return <View key={idx} style={{ flex: 1 }} />;
                  const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
                  const h = rank === 1 ? 96 : rank === 2 ? 72 : 58;
                  return (
                    <Pressable key={p.userId} onPress={() => router.push({ pathname: "/profil/[username]", params: { username: p.username } })} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                      {rank === 1 && <CrownIcon size={20} color={medal[0]} fill={medal[0]} />}
                      <View style={{ borderRadius: 40, borderWidth: 3, borderColor: medal[rank - 1] }}>
                        <Avatar id={p.userId} name={p.username} imageUrl={p.image} size={rank === 1 ? 64 : 52} />
                      </View>
                      <ThemedText variant="bodySemibold" numberOfLines={1} style={{ fontSize: 13 }}>{p.username}</ThemedText>
                      <View style={{ width: "100%", height: h, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: `${medal[rank - 1]}33`, alignItems: "center", paddingTop: 8 }}>
                        <ThemedText variant="headline" color={medal[rank - 1]} style={{ fontSize: 24 }}>{rank}</ThemedText>
                        <ThemedText variant="caption" muted>{p.points} puan</ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {leaders?.me && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.accent100 }}>
                  <TrophyIcon size={18} color={colors.accent700} />
                  <ThemedText variant="bodySemibold" color={colors.accent800} style={{ flex: 1 }}>
                    Bu hafta {leaders.me.rank}. sıradasın
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.accent700}>{leaders.me.points} puan</ThemedText>
                </View>
              )}
            </Section>
          )}

          {videos.length > 0 && (
            <Section title="Videolar" action="Tümü" onAction={() => router.push("/videolar")} padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
                {videos.map((v) => {
                  const thumb = videoThumb(v.youtubeVideoId);
                  return (
                    <Pressable key={v.id} onPress={() => router.push({ pathname: "/video/[slug]", params: { slug: v.slug } })} style={({ pressed }) => ({ width: 230, gap: 6, opacity: pressed ? 0.85 : 1 })}>
                      <View style={{ width: 230, aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#222" }}>
                        {thumb && <Image source={{ uri: thumb }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />}
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                            <PlayIcon size={20} color="#fff" fill="#fff" />
                          </View>
                        </View>
                      </View>
                      <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 18 }}>{v.title}</ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Section>
          )}

          {clubs.length > 0 && (
            <Section title="Okuma kulüpleri" action="Tümü" onAction={() => router.push("/kulupler")} padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {clubs.map((c, i) => (
                  <Pressable key={c.id} onPress={() => router.push({ pathname: "/kulup/[slug]", params: { slug: c.slug } })} style={({ pressed }) => ({ width: 210, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, opacity: pressed ? 0.85 : 1 })}>
                    <LinearGradient colors={i % 2 ? [colors.accent700, colors.accent400] : ["#4a3a6b", "#7d6aa0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 70, padding: spacing.md, justifyContent: "flex-end" }}>
                      <UsersIcon size={22} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                    <View style={{ padding: spacing.md, gap: 3 }}>
                      <ThemedText variant="title" numberOfLines={1}>{c.name}</ThemedText>
                      <ThemedText variant="caption" muted numberOfLines={1}>{c.memberCount} üye</ThemedText>
                      {c.currentBookName && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <BookOpenIcon size={12} color={colors.accent} />
                          <ThemedText variant="caption" color={colors.accent700} numberOfLines={1} style={{ flex: 1 }}>{c.currentBookName}</ThemedText>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {lists.length > 0 && (
            <Section title="Okur listeleri" action="Tümü" onAction={() => router.push("/listeler")} padded={false}>
              <View>
                {lists.map((l) => (
                  <Row key={l.id} left={<IconBubble icon={ListIcon} />} title={l.title} subtitle={`${l.bookCount} kitap · ${l.ownerUsername}`} onPress={() => router.push({ pathname: "/liste/[slug]", params: { slug: l.slug } })} />
                ))}
              </View>
            </Section>
          )}

          {listings.length > 0 && (
            <Section title="Askıda Kitap" action="Tümü" onAction={() => router.push("/askida-kitap")} padded={false}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
                {listings.map((l) => (
                  <Pressable key={l.id} onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: l.slug } })} style={({ pressed }) => ({ width: 150, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider, opacity: pressed ? 0.85 : 1 })}>
                    <ListingThumb image={l.image} bookId={l.bookId} bookHasImage={l.bookHasImage} title={l.title} height={150} />
                    <View style={{ padding: spacing.sm, gap: 2 }}>
                      <ThemedText variant="bodySemibold" color={colors.accent700} style={{ fontSize: 15 }}>
                        {l.price && l.price > 0 ? `${l.price.toLocaleString("tr-TR")} ₺` : "Ücretsiz"}
                      </ThemedText>
                      <ThemedText variant="body" numberOfLines={2} style={{ fontSize: 13, lineHeight: 17 }}>{l.title}</ThemedText>
                      {l.location && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <MapPinIcon size={11} color={colors.textMuted} />
                          <ThemedText variant="caption" muted numberOfLines={1} style={{ fontSize: 11 }}>{l.location}</ThemedText>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>
          )}

          {blogs.length > 0 && (
            <Section title="Blogdan" action="Tümü" onAction={() => router.push("/bloglar")}>
              <View style={{ gap: spacing.md }}>
                {blogs.map((b) => {
                  const src = blogImg(b.img);
                  return (
                    <Pressable key={b.id} onPress={() => router.push({ pathname: "/blog/[slug]", params: { slug: b.slug } })} style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, opacity: pressed ? 0.8 : 1 })}>
                      {src ? (
                        <Image source={{ uri: src }} style={{ width: 96, height: 72, borderRadius: radius.lg, backgroundColor: colors.surface }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 96, height: 72, borderRadius: radius.lg, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
                          <NewspaperIcon size={24} color={colors.accent} />
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 3, justifyContent: "center" }}>
                        <ThemedText variant="title" numberOfLines={2} style={{ fontSize: 15 }}>{b.title}</ThemedText>
                        {b.ownerUsername && <ThemedText variant="caption" muted numberOfLines={1}>{b.ownerUsername}</ThemedText>}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          )}

          <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            {[
              { label: "Premium", sub: "Reklamsız, ayrıcalıklı", Icon: SparklesIcon, colors: [colors.accent800, colors.accent500] as const, href: "/premium" as const },
              { label: "Puan Mağazası", sub: "Puanlarını harca", Icon: GiftIcon, colors: ["#6b2f4f", "#a0527a"] as const, href: "/puan-magazasi" as const },
            ].map((b) => (
              <Pressable key={b.label} onPress={() => router.push(b.href)} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.85 : 1 })}>
                <LinearGradient colors={b.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: spacing.md, height: 110, justifyContent: "space-between", overflow: "hidden" }}>
                  <View style={{ position: "absolute", right: -20, top: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)" }} />
                  <b.Icon size={24} color="#fff" />
                  <View>
                    <ThemedText variant="title" color="#fff" style={{ fontSize: 17 }}>{b.label}</ThemedText>
                    <ThemedText variant="caption" color="rgba(255,255,255,0.85)">{b.sub}</ThemedText>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={() => router.push("/rozetler")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, margin: spacing.lg, marginBottom: 0, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card, ...shadow.sm })}>
            <IconBubble icon={AwardIcon} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="title">Rozet Galerisi</ThemedText>
              <ThemedText variant="caption" muted>Kazanabileceğin tüm rozetleri gör</ThemedText>
            </View>
            <ChevronRightIcon size={18} color={colors.neutral400} />
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
