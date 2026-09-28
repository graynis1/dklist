import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { showActionSheet } from "@/components/ActionSheet";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpenIcon, UserIcon, MessageCircleIcon, PenLineIcon, StarIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { EmptyState, SectionHeader } from "@/components/EmptyState";
import { AuthorPostCard } from "@/components/AuthorPostCard";
import { getAuthorHub, deleteAuthorPost, type AuthorHub, type AuthorPost } from "@/api/yazarhane";

export default function AuthorHubScreen() {
  const { colors, spacing, radius, shadow } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const [hub, setHub] = useState<AuthorHub | null>(null);
  const [posts, setPosts] = useState<AuthorPost[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: `@${username}` });
  }, [navigation, username]);

  const load = useCallback(async () => {
    try {
      const r = await getAuthorHub(username);
      setHub(r.hub);
      setPosts(r.posts);
      setIsOwner(r.isOwner);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yüklenemedi.");
    }
  }, [username]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  function onPostMore(p: AuthorPost) {
    showActionSheet({
      title: p.title,
      options: [
        {
          text: "Paylaşımı sil",
          destructive: true,
          onPress: () =>
            Alert.alert("Silinsin mi?", "Bu paylaşım kalıcı olarak silinecek.", [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sil",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteAuthorPost(p.id);
                    setPosts((prev) => prev.filter((x) => x.id !== p.id));
                  } catch (err) {
                    Alert.alert("Silinemedi", err instanceof Error ? err.message : "Bir hata oluştu.");
                  }
                },
              },
            ]),
        },
      ],
      cancelText: "Kapat",
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !hub) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center" }}>
        <EmptyState icon={<PenLineIcon size={30} color={colors.accent} />} title="Yazar bulunamadı" subtitle={error ?? undefined} actionLabel="Yazarhane'ye Dön" onAction={() => router.back()} />
      </View>
    );
  }

  const actions = [
    { key: "profile", label: "Profil", Icon: UserIcon, onPress: () => router.push({ pathname: "/profil/[username]", params: { username: hub.username } }) },
    ...(isOwner ? [] : [{ key: "msg", label: "Mesaj", Icon: MessageCircleIcon, onPress: () => router.push({ pathname: "/mesajlar/[username]", params: { username: hub.username } }) }]),
    ...(hub.writerSlug ? [{ key: "books", label: "Kitapları", Icon: BookOpenIcon, onPress: () => router.push({ pathname: "/yazar/[slug]", params: { slug: hub.writerSlug! } }) }] : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.accent} />}
    >
      <View style={{ backgroundColor: colors.card, paddingBottom: spacing.lg, ...shadow.sm }}>
        <LinearGradient colors={[colors.accent800, colors.accent500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 110 }} />
        <View style={{ alignItems: "center", marginTop: -52, paddingHorizontal: spacing.lg, gap: 4 }}>
          <View style={{ padding: 4, borderRadius: 60, backgroundColor: colors.card }}>
            <Avatar id={hub.userId} name={hub.username} imageUrl={hub.image} size={100} frameColor={hub.profileFrame} frameTier={hub.frameTier} />
          </View>
          <ThemedText variant="headline" style={{ fontSize: 26, textAlign: "center" }}>{hub.writerName ?? `@${hub.username}`}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <ThemedText variant="body" muted>@{hub.username}</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: colors.accent100 }}>
              <PenLineIcon size={11} color={colors.accent700} />
              <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>Yazar</ThemedText>
            </View>
            {hub.writerScore != null && hub.writerScore > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <StarIcon size={12} color={colors.accent} fill={colors.accent} />
                <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>{Number(hub.writerScore).toFixed(1)}</ThemedText>
              </View>
            )}
          </View>
          {(hub.writerBiyo || hub.biyo) && (
            <ThemedText variant="body" style={{ textAlign: "center", lineHeight: 21, marginTop: spacing.xs }} numberOfLines={6}>
              {hub.writerBiyo || hub.biyo}
            </ThemedText>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          {actions.map((a) => (
            <Pressable
              key={a.key}
              onPress={a.onPress}
              style={({ pressed }) => ({ flex: 1, height: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.lg, backgroundColor: pressed ? colors.neutral300 : colors.neutral200 })}
            >
              <a.Icon size={17} color={colors.text} />
              <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <SectionHeader title="Paylaşımlar" count={posts.length} actionLabel={isOwner ? "Yeni yaz" : undefined} onAction={isOwner ? () => router.push("/yazarhane") : undefined} />
        {posts.length === 0 ? (
          <EmptyState icon={<PenLineIcon size={30} color={colors.accent} />} title="Henüz paylaşım yok" subtitle={isOwner ? "Yazarhane ana sayfasından ilk yazını paylaşabilirsin." : "Bu yazar henüz bir şey paylaşmadı."} />
        ) : (
          posts.map((p) => <AuthorPostCard key={p.id} post={{ ...p, profileFrame: hub.profileFrame, frameTier: hub.frameTier }} onMore={isOwner ? () => onPostMore(p) : undefined} />)
        )}
      </View>
    </ScrollView>
  );
}
