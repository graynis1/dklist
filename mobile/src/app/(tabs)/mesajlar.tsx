import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { relativeTime } from "@/lib/relativeTime";
import { getConversations, type ConversationItem } from "@/api/messages";

export default function MesajlarScreen() {
  const { colors, spacing } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [requests, setRequests] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ignore?: { current: boolean }) => {
    try {
      const result = await getConversations();
      if (!ignore?.current) {
        setConversations(result.conversations);
        setRequests(result.requests);
        setError(null);
      }
    } catch {
      if (!ignore?.current) setError("Mesajlar yüklenemedi.");
    }
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

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const data = [...requests.map((r) => ({ ...r, isRequest: true })), ...conversations.map((c) => ({ ...c, isRequest: false }))];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        <ThemedText variant="display">Mesajlar</ThemedText>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["2xl"] }}>
          <ThemedText variant="body" muted style={{ textAlign: "center" }}>
            {error}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.otherUserId)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: "/mesajlar/[username]", params: { username: item.otherUsername } })}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
            >
              <Avatar id={item.otherUserId} name={item.otherUsername} imageUrl={item.otherImage} size={44} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <ThemedText variant="bodySemibold">
                    {item.isRequest ? "İstek · " : ""}@{item.otherUsername}
                  </ThemedText>
                  {item.lastMessageAt && (
                    <ThemedText variant="caption" muted>
                      {relativeTime(item.lastMessageAt)}
                    </ThemedText>
                  )}
                </View>
                {item.lastMessagePreview && (
                  <ThemedText variant="caption" muted numberOfLines={1}>
                    {item.lastMessagePreview}
                  </ThemedText>
                )}
              </View>
              {item.unreadCount > 0 && (
                <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}>
                  <ThemedText variant="caption" color="#fff" style={{ fontSize: 11 }}>
                    {item.unreadCount}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
              <ThemedText variant="body" muted>
                Henüz bir konuşman yok.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
