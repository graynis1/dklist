import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { API_BASE_URL } from "@/api/config";
import { getBlogList, type BlogListItem } from "@/api/content";

function imgUrl(img: string | null): string | null {
  if (!img) return null;
  return /^https?:\/\//i.test(img) ? img : `${API_BASE_URL}/api/blog-image/${img}`;
}

export default function BloglarScreen() {
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getBlogList();
    if (!ignore?.current) setItems(result.items);
  }, []);

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
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      renderItem={({ item }) => {
        const src = imgUrl(item.img);
        return (
          <Pressable
            onPress={() => router.push({ pathname: "/blog/[slug]", params: { slug: item.slug } })}
            style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" }}
          >
            {src && <Image source={{ uri: src }} style={{ width: "100%", height: 160 }} resizeMode="cover" />}
            <View style={{ padding: spacing.md, gap: 4 }}>
              <ThemedText variant="title">{item.title}</ThemedText>
              <ThemedText variant="caption" muted numberOfLines={2}>{item.preview}</ThemedText>
              {item.ownerUsername && <ThemedText variant="caption" color={colors.accent}>@{item.ownerUsername}</ThemedText>}
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Henüz blog yazısı yok.</ThemedText>
        </View>
      }
    />
  );
}
