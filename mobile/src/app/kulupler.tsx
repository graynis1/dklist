import { useCallback, useEffect, useRef, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router, useNavigation } from "expo-router";
import { UsersIcon, PlusIcon, BookOpenIcon, BadgeCheckIcon, ChevronRightIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { getClubList, type ClubListItem } from "@/api/clubs";
import { ClubMark, clubDisplayName, OFFICIAL_PREFIX } from "@/components/ClubMark";

function cleanDescription(text: string) {
  return text.replace(/\s*\n+\s*/g, " ").replace(/\s*\.{3,}\s*$/, "").replace(/^Kulübün amacı:\s*$/i, "").trim();
}

export default function KuluplerScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation();
  const [items, setItems] = useState<ClubListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/kulup/yeni")} hitSlop={8} accessibilityLabel="Kulüp oluştur" style={{ padding: 6 }}>
          <PlusIcon size={24} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, colors.text]);

  const load = useCallback(async (q: string) => {
    const mine = ++seq.current;
    try {
      const result = await getClubList(q.trim());
      if (mine === seq.current) setItems(result.items);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query).catch(() => {}), query ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const header = (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Kulüp ara" />
      {!query && (
        <Pressable onPress={() => router.push("/kulup/yeni")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.accent200 : colors.accent100 })}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}>
            <PlusIcon size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySemibold" color={colors.accent800}>Kendi kulübünü kur</ThemedText>
            <ThemedText variant="caption" color={colors.accent700}>Okur arkadaşlarınla birlikte oku, tartış</ThemedText>
          </View>
          <ChevronRightIcon size={18} color={colors.accent700} />
        </Pressable>
      )}
    </View>
  );

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
      data={items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(query).catch(() => {}); setRefreshing(false); }} tintColor={colors.accent} />}
      renderItem={({ item }) => {
        const official = OFFICIAL_PREFIX.test(item.name);
        const desc = cleanDescription(item.description ?? "");
        return (
          <Pressable
            onPress={() => router.push({ pathname: "/kulup/[slug]", params: { slug: item.slug } })}
            style={({ pressed }) => ({ flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral100 : colors.card })}
          >
            <ClubMark name={item.name} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <ThemedText variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>{clubDisplayName(item.name)}</ThemedText>
                {official && <BadgeCheckIcon size={16} color={colors.accent} />}
              </View>
              {desc ? <ThemedText variant="caption" muted numberOfLines={2} style={{ fontSize: 13, lineHeight: 18 }}>{desc}</ThemedText> : null}
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <UsersIcon size={13} color={colors.textMuted} />
                  <ThemedText variant="caption" muted>{item.memberCount} üye</ThemedText>
                </View>
                {item.currentBookName && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
                    <BookOpenIcon size={13} color={colors.accent700} />
                    <ThemedText variant="caption" color={colors.accent700} numberOfLines={1} style={{ flexShrink: 1 }}>{item.currentBookName}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          icon={<UsersIcon size={30} color={colors.accent} />}
          title={query ? "Kulüp bulunamadı" : "Henüz kulüp yok"}
          subtitle={query ? `“${query}” ile eşleşen bir kulüp yok.` : "İlk kulübü sen kur, okur arkadaşlarını davet et."}
          actionLabel="Kulüp Oluştur"
          onAction={() => router.push("/kulup/yeni")}
        />
      }
    />
  );
}
