import { useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { SearchIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { search as searchApi, type SearchResults } from "@/api/search";

export default function KesfetScreen() {
  const { colors, spacing } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // Same react-hooks/set-state-in-effect false positive documented in
      // AuthContext.tsx - clearing stale results when the query shrinks
      // below the minimum length is a real, correct synchronous reset,
      // not a fetch-on-mount case, but the rule flags any setState
      // reachable from an effect regardless.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await searchApi(query);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hasAnyResult =
    results && (results.books.length + results.writers.length + results.translators.length + results.publishers.length + results.users.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <ThemedText variant="display">Keşfet</ThemedText>
        <TextField
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder="Kitap, yazar, çevirmen, yayınevi veya kullanıcı ara…"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        {loading && (
          <View style={{ paddingTop: spacing.xl }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {!loading && query.trim().length >= 2 && !hasAnyResult && (
          <View style={{ alignItems: "center", paddingTop: spacing.xl }}>
            <SearchIcon color={colors.neutral400} size={28} />
            <ThemedText variant="body" muted style={{ marginTop: spacing.sm }}>
              Sonuç bulunamadı.
            </ThemedText>
          </View>
        )}

        {!loading && results && results.books.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="label" color={colors.textMuted}>
              Kitaplar
            </ThemedText>
            {results.books.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: b.slug } })}
                style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}
              >
                <BookCover id={b.id} title={b.name} author={b.writers.join(", ")} width={40} height={58} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="title" numberOfLines={1}>
                    {b.name}
                  </ThemedText>
                  <ThemedText variant="caption" muted numberOfLines={1}>
                    {b.writers.join(", ") || "Yazar bilinmiyor"}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loading && results && results.writers.length > 0 && (
          <ResultSection
            title="Yazarlar"
            items={results.writers.map((w) => ({ id: w.id, label: w.name, slug: w.slug }))}
            hrefBase="/yazar/[slug]"
            paramKey="slug"
          />
        )}
        {!loading && results && results.translators.length > 0 && (
          <ResultSection
            title="Çevirmenler"
            items={results.translators.map((w) => ({ id: w.id, label: w.name, slug: w.slug }))}
            hrefBase="/cevirmen/[slug]"
            paramKey="slug"
          />
        )}
        {!loading && results && results.publishers.length > 0 && (
          <ResultSection
            title="Yayınevleri"
            items={results.publishers.map((w) => ({ id: w.id, label: w.name, slug: w.slug }))}
            hrefBase="/yayinevi/[slug]"
            paramKey="slug"
          />
        )}
        {!loading && results && results.users.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <ThemedText variant="label" color={colors.textMuted}>
              Kullanıcılar
            </ThemedText>
            {results.users.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => router.push({ pathname: "/profil/[username]", params: { username: u.username } })}
                style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}
              >
                <Avatar id={u.id} name={u.username} size={32} />
                <ThemedText variant="body">@{u.username}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultSection({
  title,
  items,
  hrefBase,
  paramKey,
}: {
  title: string;
  items: { id: number; label: string; slug: string }[];
  hrefBase: "/yazar/[slug]" | "/cevirmen/[slug]" | "/yayinevi/[slug]";
  paramKey: "slug";
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="label" color={colors.textMuted}>
        {title}
      </ThemedText>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push({ pathname: hrefBase, params: { [paramKey]: item.slug } })}>
          <ThemedText variant="body">{item.label}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}
