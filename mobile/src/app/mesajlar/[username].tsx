import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useNavigation, router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { BookCover } from "@/components/BookCover";
import { getThread, sendMessage, type MessageItem } from "@/api/messages";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL } from "@/api/config";

const POLL_MS = 5000;

function AttachmentCard({ item }: { item: MessageItem }) {
  const { colors, spacing, radius } = useTheme();
  if (!item.attachment) return null;

  if (item.type === "book") {
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/kitap/[slug]", params: { slug: item.attachment!.slug } })}
        style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}
      >
        <BookCover id={item.attachment.id} title={item.attachment.title} width={40} height={58} imageUrl={`${API_BASE_URL}${item.attachment.image}`} />
        <ThemedText variant="body" numberOfLines={2} style={{ flex: 1 }}>{item.attachment.title}</ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/askida-kitap/[slug]", params: { slug: item.attachment!.slug } })}
      style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", padding: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface }}
    >
      {item.attachment.image && (
        <Image source={{ uri: `${API_BASE_URL}${item.attachment.image}` }} style={{ width: 40, height: 40, borderRadius: 6 }} />
      )}
      <View style={{ flex: 1 }}>
        <ThemedText variant="body" numberOfLines={1}>{item.attachment.title}</ThemedText>
        {item.attachment.price != null && (
          <ThemedText variant="caption" color={colors.accent}>{item.attachment.price.toLocaleString("tr-TR")} ₺</ThemedText>
        )}
      </View>
    </Pressable>
  );
}

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
            <View style={{ alignItems: mine ? "flex-end" : "flex-start", gap: 4 }}>
              {item.attachment && <View style={{ maxWidth: "78%" }}><AttachmentCard item={item} /></View>}
              {item.text && (
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
              )}
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
