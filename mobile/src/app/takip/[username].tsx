import { useEffect, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { ChevronRightIcon, UsersIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Chip } from "@/components/ui";
import { apiFetch } from "@/api/client";

type Kind = "followers" | "following";
interface Person { id: number; username: string; image: string | null }

/** Followers / following of a profile (customer: tap the counts to open them, like the web). */
export default function TakipScreen() {
  const { colors, spacing } = useTheme();
  const { username, type } = useLocalSearchParams<{ username: string; type?: string }>();
  const navigation = useNavigation();
  const [kind, setKind] = useState<Kind>(type === "following" ? "following" : "followers");
  const [items, setItems] = useState<Person[] | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: username });
  }, [navigation, username]);

  useEffect(() => {
    let alive = true;
    apiFetch<{ status: "ok"; items: Person[] }>(`/profile/${encodeURIComponent(username)}/follows?type=${kind}`)
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [username, kind]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", gap: 6, padding: spacing.lg, paddingBottom: spacing.sm }}>
        <Chip label="Takipçiler" active={kind === "followers"} onPress={() => { setItems(null); setKind("followers"); }} />
        <Chip label="Takip edilenler" active={kind === "following"} onPress={() => { setItems(null); setKind("following"); }} />
      </View>
      {items === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
          ListEmptyComponent={<EmptyState icon={<UsersIcon size={30} color={colors.accent} />} title={kind === "followers" ? "Henüz takipçi yok" : "Henüz kimseyi takip etmiyor"} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/profil/[username]", params: { username: item.username } })}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: pressed ? colors.neutral200 : colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider })}
            >
              <Avatar id={item.id} name={item.username} imageUrl={item.image} size={44} />
              <ThemedText variant="bodySemibold" style={{ flex: 1 }} numberOfLines={1}>{item.username}</ThemedText>
              <ChevronRightIcon size={18} color={colors.neutral400} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
