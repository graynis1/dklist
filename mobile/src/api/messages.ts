import { apiFetch } from "@/api/client";

export interface ConversationItem {
  otherUserId: number;
  otherUsername: string;
  otherImage: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageAttachment {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  price?: number | null;
}

export interface MessageItem {
  id: number;
  text: string;
  senderId: number;
  createdAt: string | null;
  type: "text" | "book" | "store";
  attachment: MessageAttachment | null;
}

export async function getConversations(): Promise<{ conversations: ConversationItem[]; requests: ConversationItem[] }> {
  const result = await apiFetch<{ status: "ok"; conversations: ConversationItem[]; requests: ConversationItem[] }>(
    "/messages/conversations",
  );
  return { conversations: result.conversations, requests: result.requests };
}

export async function getThread(
  username: string,
  cursor?: number,
): Promise<{ otherUserId: number; otherUsername: string; otherImage: string | null; messages: MessageItem[]; hasMore: boolean; nextCursor: number | null }> {
  const query = cursor ? `?cursor=${cursor}` : "";
  return apiFetch(`/messages/thread/${encodeURIComponent(username)}${query}`);
}

export async function sendMessage(
  username: string,
  text: string,
  attachment?: { type: "book" | "store"; id: number },
): Promise<MessageItem> {
  const result = await apiFetch<{ status: "ok"; message: MessageItem }>("/messages/send", {
    method: "POST",
    body: JSON.stringify({
      username,
      text,
      attachmentType: attachment?.type,
      referencedId: attachment?.id,
    }),
  });
  return result.message;
}

/** Clear chats on my side only - selected ones, or every conversation. */
export async function deleteChats(otherUserIds: number[]): Promise<void> {
  await apiFetch("/messages/delete", { method: "POST", body: JSON.stringify({ otherUserIds }) });
}

export async function deleteAllChats(): Promise<void> {
  await apiFetch("/messages/delete", { method: "POST", body: JSON.stringify({ all: true }) });
}

/** Hides one of my own messages (the other side keeps their copy). */
export async function deleteOwnMessage(messageId: number): Promise<void> {
  await apiFetch("/messages/delete", { method: "POST", body: JSON.stringify({ messageId }) });
}
