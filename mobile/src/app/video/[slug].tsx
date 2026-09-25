import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator, Image, Pressable, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { PlayCircleIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { getVideo, type VideoDetail } from "@/api/content";

/**
 * Deliberately hands off to the real YouTube app (or the system browser as
 * its fallback) instead of embedding a WebView-based player in-app - the
 * one place an embedded YouTube player would be justified even under this
 * app's own "no WebView" rule, and this is a cleaner alternative to it:
 * YouTube's own native app gives a genuinely better playback experience
 * (picture-in-picture, background audio, the visitor's own account/
 * watch history) than any in-app embed could.
 */
export default function VideoDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getVideo(slug);
    if (!ignore?.current) setVideo(result.video);
  }, [slug]);

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

  function onPlay() {
    if (!video?.youtubeVideoId) return;
    const appUrl = `vnd.youtube://${video.youtubeVideoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Video bulunamadı.</ThemedText>
      </View>
    );
  }

  const thumb = video.youtubeVideoId ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg` : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md }}>
      <Pressable onPress={onPlay}>
        {thumb && <Image source={{ uri: thumb }} style={{ width: "100%", height: 220, borderRadius: 8 }} resizeMode="cover" />}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <PlayCircleIcon color="#fff" size={64} />
        </View>
      </Pressable>
      <ThemedText variant="headline">{video.title}</ThemedText>
      <ThemedText variant="caption" muted>{video.viewCount} görüntülenme</ThemedText>
    </View>
  );
}
