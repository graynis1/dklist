import { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator, Image, Pressable, Linking, Alert, ScrollView, Platform } from "react-native";
import { shareLink } from "@/lib/share";
import { KeyboardScreen } from "@/components/KeyboardScreen";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { PlayIcon, Share2Icon, EyeIcon, CalendarIcon, PlayCircleIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { EntityCommentSection, type EntityComment } from "@/components/EntityCommentSection";
import { getVideo, getVideoList, addVideoComment, type VideoDetail, type VideoListItem } from "@/api/content";
import { videoThumb } from "@/lib/videoThumb";
import { formatDateTr } from "@/lib/dateTr";

/**
 * Playback hands off to the YouTube app (browser as fallback) rather than an
 * in-app WebView embed: better playback (PiP, background audio, the viewer's
 * own account) and no embed-restriction failures.
 */
export default function VideoDetailScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const [more, setMore] = useState<VideoListItem[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const result = await getVideo(slug);
      setVideo(result.video);
      setComments(result.comments);
    } catch {
      setVideo(null);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
    getVideoList(1)
      .then((r) => setMore(r.items.filter((v) => v.slug !== slug).slice(0, 6)))
      .catch(() => {});
  }, [load, slug]);

  useEffect(() => {
    navigation.setOptions({ title: "" });
  }, [navigation]);

  function onPlay() {
    if (!video?.youtubeVideoId) return;
    const appUrl = Platform.OS === "ios" ? `youtube://watch?v=${video.youtubeVideoId}` : `vnd.youtube://${video.youtubeVideoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${video.youtubeVideoId}`;
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
  }

  async function submitComment() {
    const trimmed = commentText.trim();
    if (trimmed.length < 2) return;
    setCommentSaving(true);
    try {
      await addVideoComment(slug, trimmed);
      setCommentText("");
      await load();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yorum eklenemedi.");
    } finally {
      setCommentSaving(false);
    }
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
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState icon={<PlayCircleIcon size={30} color={colors.accent} />} title="Video bulunamadı" actionLabel="Videolara Dön" onAction={() => router.back()} />
      </View>
    );
  }

  const thumb = videoThumb(video.youtubeVideoId);

  return (
    <KeyboardScreen style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["3xl"] }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onPlay} style={{ backgroundColor: "#000" }}>
          {thumb ? <Image source={{ uri: thumb }} style={{ width: "100%", aspectRatio: 16 / 9 }} resizeMode="cover" /> : <View style={{ width: "100%", aspectRatio: 16 / 9 }} />}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" }}>
            <View style={{ width: 76, height: 54, borderRadius: 14, backgroundColor: "#d93025", alignItems: "center", justifyContent: "center", ...shadow.lg }}>
              <PlayIcon size={28} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        </Pressable>

        <View style={{ backgroundColor: colors.card, padding: spacing.lg, gap: spacing.sm, ...shadow.sm }}>
          <ThemedText variant="headline" style={{ fontSize: 22, lineHeight: 28 }}>{video.title}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <EyeIcon size={13} color={colors.textMuted} />
              <ThemedText variant="caption" muted>{video.viewCount} görüntülenme</ThemedText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <CalendarIcon size={13} color={colors.textMuted} />
              <ThemedText variant="caption" muted>{formatDateTr(video.createdDate)}</ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <Pressable
              onPress={onPlay}
              style={({ pressed }) => ({ flex: 1, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.lg, backgroundColor: pressed ? "#b3261e" : "#d93025" })}
            >
              <PlayIcon size={17} color="#fff" fill="#fff" />
              <ThemedText variant="bodySemibold" color="#fff">YouTube&apos;da İzle</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void shareLink(video.title, `https://dklist.com/video/${video.slug}`)}
              style={({ pressed }) => ({ height: 44, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
            >
              <Share2Icon size={17} color={colors.text} />
              <ThemedText variant="bodySemibold">Paylaş</ThemedText>
            </Pressable>
          </View>
        </View>

        {more.length > 0 && (
          <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, paddingVertical: spacing.md, gap: spacing.sm, ...shadow.sm }}>
            <ThemedText variant="title" style={{ fontSize: 18, paddingHorizontal: spacing.lg }}>Sıradaki videolar</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
              {more.map((v) => (
                <Pressable key={v.id} onPress={() => router.push({ pathname: "/video/[slug]", params: { slug: v.slug } })} style={({ pressed }) => ({ width: 200, gap: 6, opacity: pressed ? 0.8 : 1 })}>
                  <View style={{ borderRadius: radius.lg, overflow: "hidden", backgroundColor: "#000" }}>
                    {videoThumb(v.youtubeVideoId, false) && <Image source={{ uri: videoThumb(v.youtubeVideoId, false)! }} style={{ width: "100%", aspectRatio: 16 / 9 }} resizeMode="cover" />}
                    <View style={{ position: "absolute", right: 6, bottom: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" }}>
                      <PlayIcon size={12} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                  <ThemedText variant="bodySemibold" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 18 }}>{v.title}</ThemedText>
                  <ThemedText variant="caption" muted style={{ fontSize: 11, marginTop: -3 }}>{v.viewCount} görüntülenme</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ backgroundColor: colors.card, marginTop: spacing.sm, padding: spacing.lg, ...shadow.sm }}>
          <EntityCommentSection
            comments={comments}
            commentText={commentText}
            onCommentTextChange={setCommentText}
            onSubmitComment={submitComment}
            submitting={commentSaving}
            onReplied={load}
          />
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}
