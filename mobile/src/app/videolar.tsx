import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { PlayCircleIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getVideoList, type VideoListItem } from "@/api/content";

function thumbUrl(youtubeVideoId: string | null): string | null {
  return youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` : null;
}

export default function VideolarScreen() {
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getVideoList();
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
        const src = thumbUrl(item.youtubeVideoId);
        return (
          <Pressable
            onPress={() => router.push({ pathname: "/video/[slug]", params: { slug: item.slug } })}
            style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, overflow: "hidden" }}
          >
            <View>
              {src && <Image source={{ uri: src }} style={{ width: "100%", height: 180 }} resizeMode="cover" />}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                <PlayCircleIcon color="#fff" size={48} />
              </View>
            </View>
            <View style={{ padding: spacing.md, gap: 4 }}>
              <ThemedText variant="title">{item.title}</ThemedText>
              <ThemedText variant="caption" muted>{item.viewCount} görüntülenme</ThemedText>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={{ alignItems: "center", paddingTop: spacing["2xl"] }}>
          <ThemedText variant="body" muted>Henüz video yok.</ThemedText>
        </View>
      }
    />
  );
}
