import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { Button } from "@/components/Button";
import { getProfile, toggleFollow, type OtherProfileResponse } from "@/api/profileOther";
import type { ReadStatus } from "@/api/library";

const SHELF_LABELS: Record<ReadStatus, string> = {
  currentRead: "Okuyor",
  finishRead: "Okudu",
  targetRead: "Okuyacak",
  dropRead: "Yarıda Bıraktı",
};

export default function OtherProfileScreen() {
  const { colors, spacing, radius } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const [data, setData] = useState<OtherProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [followSaving, setFollowSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `@${username}` });
  }, [navigation, username]);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getProfile(username);
    if (ignore?.current) return;
    setData(result);
  }, [username]);

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

  async function onToggleFollow() {
    setFollowSaving(true);
    try {
      await toggleFollow(username);
      await load();
    } finally {
      setFollowSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Kullanıcı bulunamadı.</ThemedText>
      </View>
    );
  }

  const { profile, counts, isSelf, following, canSeeLibrary, badges, library } = data;
  const displayName = [profile.name, profile.surname].filter(Boolean).join(" ") || profile.username;
  const shelves: ReadStatus[] = ["currentRead", "finishRead", "targetRead", "dropRead"];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Avatar id={profile.id} name={displayName} imageUrl={profile.image} size={84} />
        <ThemedText variant="headline" style={{ textAlign: "center" }}>{displayName}</ThemedText>
        <ThemedText variant="caption" muted>@{profile.username}</ThemedText>
        {profile.biyo && <ThemedText variant="body" style={{ textAlign: "center" }}>{profile.biyo}</ThemedText>}

        <View style={{ flexDirection: "row", gap: spacing.xl, marginTop: spacing.xs }}>
          <View style={{ alignItems: "center" }}>
            <ThemedText variant="title">{counts.followers}</ThemedText>
            <ThemedText variant="caption" muted>Takipçi</ThemedText>
          </View>
          <View style={{ alignItems: "center" }}>
            <ThemedText variant="title">{counts.following}</ThemedText>
            <ThemedText variant="caption" muted>Takip</ThemedText>
          </View>
        </View>

        {!isSelf && (
          <Button
            title={following ? "Takip Ediliyor ✓" : "Takip Et"}
            variant={following ? "primary" : "secondary"}
            onPress={onToggleFollow}
            disabled={followSaving}
            style={{ marginTop: spacing.sm }}
          />
        )}
      </View>

      {badges.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <ThemedText variant="label" color={colors.textMuted}>Rozetler</ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {badges.map((b) => (
              <View key={b.id} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider }}>
                <ThemedText variant="caption">{b.name}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {!canSeeLibrary ? (
        <ThemedText variant="body" muted style={{ textAlign: "center", paddingTop: spacing.lg }}>
          Bu kullanıcının kitaplığı gizli.
        </ThemedText>
      ) : (
        library &&
        shelves.map((shelf) =>
          library[shelf].length > 0 ? (
            <View key={shelf} style={{ gap: spacing.sm }}>
              <ThemedText variant="label" color={colors.textMuted}>
                {SHELF_LABELS[shelf]} ({library[shelf].length})
              </ThemedText>
              <FlatList
                data={library[shelf]}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ gap: spacing.sm }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.slug } })}>
                    <BookCover id={item.id} title={item.name} author={item.writers.join(", ")} width={88} height={128} />
                  </Pressable>
                )}
              />
            </View>
          ) : null,
        )
      )}
    </ScrollView>
  );
}
