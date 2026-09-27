import { useState } from "react";
import { View, Pressable, Share } from "react-native";
import { router } from "expo-router";
import { PenLineIcon, MoreHorizontalIcon, Share2Icon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { relativeTime } from "@/lib/relativeTime";
import type { AuthorPost } from "@/api/yazarhane";

export function AuthorPostCard({ post, onMore }: { post: AuthorPost; onMore?: () => void }) {
  const { colors, spacing, radius, shadow } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = post.content.length > 320;
  const goHub = () => router.push({ pathname: "/yazarhane/[username]", params: { username: post.username } });

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, padding: spacing.lg, gap: spacing.sm, ...shadow.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Pressable onPress={goHub}>
          <Avatar id={post.userId} name={post.username} imageUrl={post.image} size={40} frameColor={post.profileFrame ?? null} frameTier={post.frameTier ?? 1} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText variant="bodySemibold" onPress={goHub}>@{post.username}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <PenLineIcon size={11} color={colors.textMuted} />
            <ThemedText variant="caption" muted>{relativeTime(post.createdDate)}</ThemedText>
          </View>
        </View>
        {onMore && (
          <Pressable onPress={onMore} hitSlop={10} style={{ padding: 4 }}>
            <MoreHorizontalIcon size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ThemedText variant="headline" style={{ fontSize: 22, lineHeight: 27 }}>{post.title}</ThemedText>
      <ThemedText variant="body" style={{ lineHeight: 23 }} numberOfLines={expanded ? undefined : 7}>
        {post.content}
      </ThemedText>
      {long && (
        <ThemedText variant="bodySemibold" color={colors.accent} onPress={() => setExpanded((v) => !v)}>
          {expanded ? "Daha az göster" : "Devamını oku"}
        </ThemedText>
      )}

      <View style={{ height: 1, backgroundColor: colors.divider, marginTop: spacing.xs }} />
      <Pressable
        onPress={() => Share.share({ message: `${post.title} — @${post.username}\nhttps://dklist.com/yazarhane/${post.username}` }).catch(() => {})}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral200 : "transparent" })}
      >
        <Share2Icon size={17} color={colors.textMuted} />
        <ThemedText variant="bodySemibold" color={colors.textMuted} style={{ fontSize: 13.5 }}>Paylaş</ThemedText>
      </Pressable>
    </View>
  );
}
