import { useState } from "react";
import { View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { MessageSquareIcon, StarIcon } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuth } from "@/auth/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { ComposerBar } from "@/components/ComposerBar";
import { relativeTime } from "@/lib/relativeTime";
import { addCommentReply } from "@/api/book";

export interface EntityCommentReply {
  id: number;
  text: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  replies: EntityCommentReply[];
}

export interface EntityComment {
  id: number;
  text: string;
  date: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  authorScore: number | null;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  replies: EntityCommentReply[];
}

function Bubble({ username, userId, image, frameColor, frameTier, text, size, meta }: {
  username: string;
  userId: number;
  image: string | null;
  frameColor: string | null;
  frameTier: 1 | 2 | 3 | 4;
  text: string;
  size: number;
  meta?: React.ReactNode;
}) {
  const { colors, spacing } = useTheme();
  const go = () => router.push({ pathname: "/profil/[username]", params: { username } });
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      <Pressable onPress={go}>
        <Avatar id={userId} name={username} imageUrl={image} size={size} frameColor={frameColor} frameTier={frameTier} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "flex-start" }}>
        <View style={{ maxWidth: "100%", backgroundColor: colors.neutral200, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }}>
          <ThemedText variant="bodySemibold" style={{ fontSize: 13.5 }} onPress={go}>{username}</ThemedText>
          <ThemedText variant="body" style={{ lineHeight: 20, marginTop: 1 }}>{text}</ThemedText>
        </View>
        {meta}
      </View>
    </View>
  );
}

/** Shared comment thread for book-like entities (writer, translator, blog,
 * video, ...): Facebook-style bubbles, inline replies, pill composer. */
export function EntityCommentSection({
  comments,
  commentText,
  onCommentTextChange,
  onSubmitComment,
  submitting,
  onReplied,
  title = "Yorumlar",
}: {
  comments: EntityComment[];
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: () => void;
  submitting: boolean;
  onReplied: () => Promise<void>;
  title?: string;
}) {
  const { colors, spacing } = useTheme();
  const { profile } = useAuth();

  return (
    <View style={{ gap: spacing.md }}>
      <ThemedText variant="title" style={{ fontSize: 18 }}>
        {title}
        <ThemedText variant="body" muted>{`  ${comments.length}`}</ThemedText>
      </ThemedText>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing.sm }}>
        {profile && <Avatar id={profile.id} name={profile.username} imageUrl={profile.image} size={36} frameColor={profile.profileFrame} frameTier={profile.frameTier} />}
        <View style={{ flex: 1 }}>
          <ComposerBar
            bordered={false}
            value={commentText}
            onChangeText={onCommentTextChange}
            onSend={onSubmitComment}
            sending={submitting}
            canSend={commentText.trim().length >= 2}
            placeholder="Bir yorum yaz…"
          />
        </View>
      </View>

      {comments.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs }}>
          <MessageSquareIcon size={28} color={colors.neutral400} />
          <ThemedText variant="body" muted>İlk yorumu sen yaz.</ThemedText>
        </View>
      ) : (
        comments.map((c) => <EntityCommentRow key={c.id} comment={c} onReplied={onReplied} />)
      )}
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

  const renderReply = (r: EntityCommentReply, depth: number): React.ReactNode => (
    <View key={r.id} style={{ marginLeft: depth === 1 ? 44 : 30, marginTop: spacing.sm }}>
      <Bubble username={r.authorUsername} userId={r.authorUserId} image={r.authorImage} frameColor={r.profileFrame} frameTier={r.frameTier} text={r.text} size={26} />
      {r.replies.map((r2) => renderReply(r2, depth + 1))}
    </View>
  );

  return (
    <View>
      <Bubble
        username={comment.authorUsername}
        userId={comment.authorUserId}
        image={comment.authorImage}
        frameColor={comment.profileFrame}
        frameTier={comment.frameTier}
        text={comment.text}
        size={36}
        meta={
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 12, paddingTop: 4 }}>
            <ThemedText variant="caption" muted>{relativeTime(comment.date)}</ThemedText>
            {comment.authorScore != null && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <StarIcon size={11} color={colors.accent} fill={colors.accent} />
                <ThemedText variant="caption" color={colors.accent700} style={{ fontWeight: "600" }}>{comment.authorScore}/10</ThemedText>
              </View>
            )}
            <ThemedText variant="caption" color={showReplyBox ? colors.accent : colors.textMuted} style={{ fontWeight: "700" }} onPress={() => setShowReplyBox((v) => !v)}>
              Yanıtla
            </ThemedText>
          </View>
        }
      />
      {comment.replies.map((r) => renderReply(r, 1))}
      {showReplyBox && (
        <View style={{ marginLeft: 44, marginTop: spacing.sm }}>
          <ComposerBar
            bordered={false}
            value={replyText}
            onChangeText={setReplyText}
            onSend={submitReply}
            sending={saving}
            canSend={replyText.trim().length >= 2}
            placeholder={`${comment.authorUsername} kullanıcısına yanıt ver…`}
            autoFocus
          />
        </View>
      )}
    </View>
  );
}
