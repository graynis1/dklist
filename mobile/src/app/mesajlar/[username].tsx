import { useCallback, useEffect, useState } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { getThread, sendMessage, type MessageItem } from "@/api/messages";
import { useAuth } from "@/auth/AuthContext";

const POLL_MS = 5000;

export default function ThreadScreen() {
  const { colors, spacing, radius } = useTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `@${username}` });
  }, [navigation, username]);

  const load = useCallback(async () => {
    const result = await getThread(username);
    setMessages(result.messages);
  }, [username]);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => {
      if (!ignore) setLoading(false);
    });
    const interval = setInterval(() => {
      load().catch(() => {});
    }, POLL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    setSending(true);
    try {
      const sent = await sendMessage(username, trimmed);
      setMessages((prev) => [...prev, sent]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item }) => {
          const mine = item.senderId === profile?.id;
          return (
            <View style={{ alignItems: mine ? "flex-end" : "flex-start" }}>
              <View
                style={{
                  maxWidth: "78%",
                  borderRadius: radius.lg,
                  paddingVertical: 9,
                  paddingHorizontal: 13,
                  backgroundColor: mine ? colors.accent : colors.surface,
                }}
              >
                <ThemedText variant="body" color={mine ? "#fff" : colors.text}>
                  {item.text}
                </ThemedText>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: spacing["3xl"] }}>
            <ThemedText variant="body" muted>
              Henüz mesaj yok - ilk mesajı sen gönder.
            </ThemedText>
          </View>
        }
      />
      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <TextField label="" value={text} onChangeText={setText} placeholder="Mesaj yaz…" multiline />
        </View>
        <Button title="Gönder" onPress={submit} disabled={sending || !text.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
