import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { getClub, joinClub, leaveClub, type ClubDetail } from "@/api/clubs";

export default function KulupDetailScreen() {
  const { colors, spacing } = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    const result = await getClub(slug);
    if (!ignore?.current) {
      setClub(result.club);
      setIsMember(result.isMember);
      setIsPending(result.isPending);
    }
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

  async function onToggleMembership() {
    setSaving(true);
    try {
      if (isMember) {
        await leaveClub(slug);
      } else {
        await joinClub(slug);
      }
      await load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!club) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: spacing["2xl"] }}>
        <ThemedText variant="body" muted>Kulüp bulunamadı.</ThemedText>
      </View>
    );
  }

  const buttonTitle = isMember ? "Kulüpten Ayrıl" : isPending ? "Onay Bekliyor" : "Katıl";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ThemedText variant="headline">{club.name}</ThemedText>
        <ThemedText variant="caption" muted>{club.memberCount} üye · {club.visibility === "public" ? "Herkese açık" : "Gizli"}</ThemedText>
        <ThemedText variant="body">{club.description}</ThemedText>
      </View>

      <Button title={buttonTitle} variant={isMember ? "secondary" : "primary"} onPress={onToggleMembership} disabled={saving || isPending} />

      {club.currentBookName && (
        <Pressable
          onPress={() => club.currentBookSlug && router.push({ pathname: "/kitap/[slug]", params: { slug: club.currentBookSlug } })}
          style={{ gap: 4 }}
        >
          <ThemedText variant="label" color={colors.textMuted}>Şu An Okunan Kitap</ThemedText>
          <ThemedText variant="title">{club.currentBookName}</ThemedText>
          <ThemedText variant="caption" muted>{club.currentBookWriters.join(", ")}</ThemedText>
        </Pressable>
      )}

      <View style={{ gap: spacing.sm }}>
        <ThemedText variant="label" color={colors.textMuted}>Üyeler ({club.members.length})</ThemedText>
        {club.members.map((m) => (
          <Pressable
            key={m.userId}
            onPress={() => router.push({ pathname: "/profil/[username]", params: { username: m.username } })}
            style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}
          >
            <Avatar id={m.userId} name={m.username} size={28} />
            <ThemedText variant="body">@{m.username}</ThemedText>
            {m.role !== "member" && <ThemedText variant="caption" color={colors.accent}>· {m.role}</ThemedText>}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
