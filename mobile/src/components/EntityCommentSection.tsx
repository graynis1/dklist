import { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { relativeTime } from "@/lib/relativeTime";
import { addCommentReply } from "@/api/book";

export interface EntityCommentReply {
  id: number;
  text: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  replies: EntityCommentReply[];
}

export interface EntityComment {
  id: number;
  text: string;
  date: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  replies: EntityCommentReply[];
}

/**
 * Same comment+reply UI as kitap/[slug].tsx's own CommentRow, extracted so
 * yazar/cevirmen (and any future entity with the generic addEntityComment/
 * getEntityComments backend) don't each need their own copy. Reply posting
 * reuses the same generic /comment/[id]/reply route book comments already
 * use - it only needs the comment's own id, not its entity type.
 */
export function EntityCommentSection({
  comments,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  submitting,
  onReplied,
}: {
  comments: EntityComment[];
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: () => void;
  submitting: boolean;
  onReplied: () => Promise<void>;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <ThemedText variant="label" color={colors.textMuted}>
        Yorumlar ({comments.length})
      </ThemedText>

      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" }}>
        <View style={{ flex: 1 }}>
          <TextField label="" value={commentText} onChangeText={onCommentTextChange} placeholder="Bir yorum yaz…" multiline />
        </View>
        <Button title="Gönder" onPress={onSubmitComment} disabled={submitting || commentText.trim().length < 2} />
      </View>

      {comments.map((c) => (
        <EntityCommentRow key={c.id} comment={c} onReplied={onReplied} />
      ))}
    </View>
  );
}

function EntityCommentRow({ comment, onReplied }: { comment: EntityComment; onReplied: () => Promise<void> }) {
  const { colors, spacing } = useTheme();
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitReply() {
    const trimmed = replyText.trim();
    if (trimmed.length < 2) return;
    setSaving(true);
    try {
      await addCommentReply(comment.id, trimmed);
      setReplyText("");
      setShowReplyBox(false);
      await onReplied();
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Yanıt eklenemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        onPress={() => router.push({ pathname: "/profil/[username]", params: { username: comment.authorUsername } })}
        style={{ flexDirection: "row", gap: spacing.sm }}
      >
        <Avatar id={comment.authorUserId} name={comment.authorUsername} imageUrl={comment.authorImage} size={32} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "baseline" }}>
            <ThemedText variant="bodySemibold">@{comment.authorUsername}</ThemedText>
            <ThemedText variant="caption" muted>{relativeTime(comment.date)}</ThemedText>
          </View>
          <ThemedText variant="body">{comment.text}</ThemedText>
        </View>
      </Pressable>

      <Pressable onPress={() => setShowReplyBox((v) => !v)} style={{ marginLeft: 44 }}>
        <ThemedText variant="caption" color={colors.accent}>Yanıtla</ThemedText>
      </Pressable>

      {showReplyBox && (
        <View style={{ flexDirection: "row", gap: spacing.xs, marginLeft: 44, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <TextField label="" value={replyText} onChangeText={setReplyText} placeholder="Yanıt yaz…" />
          </View>
          <Button title="Gönder" onPress={submitReply} disabled={saving || replyText.trim().length < 2} />
        </View>
      )}

      {comment.replies.map((r) => (
        <View key={r.id} style={{ marginLeft: 44, gap: 2 }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "baseline" }}>
            <ThemedText variant="bodySemibold">@{r.authorUsername}</ThemedText>
          </View>
          <ThemedText variant="body">{r.text}</ThemedText>
          {r.replies.map((r2) => (
            <View key={r2.id} style={{ marginLeft: 20, gap: 2 }}>
              <ThemedText variant="bodySemibold">@{r2.authorUsername}</ThemedText>
              <ThemedText variant="body">{r2.text}</ThemedText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
