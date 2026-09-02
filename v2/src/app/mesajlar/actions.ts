"use server";

import { auth } from "@/auth";
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { user, store } from "@/db/schema";
import {
  sendMessage,
  deleteMessage,
  deleteChat,
  deleteAllChats,
  getMessages,
  acceptMessageRequest,
  type MessageItem,
  type MessageType,
} from "@/db/queries/messages";
import { searchBooks } from "@/db/queries/search";

async function requireUserId(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Giriş yapmalısınız.");
  }
  return Number(session.user.id);
}

export async function sendMessageAction(
  otherUsername: string,
  text: string,
  attachmentType: MessageType = "text",
  referencedId?: number,
): Promise<{ status: boolean; message?: string; sentId?: number }> {
  try {
    const userId = await requireUserId();
    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, otherUsername))
      .limit(1);
    if (!target) {
      return { status: false, message: "Kullanıcı bulunamadı." };
    }
    const result = await sendMessage(userId, target.id, text, attachmentType, referencedId);
    return { status: true, sentId: result.id };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

/** Book/store "Paylaş" share button - creates the chat if needed and sends a
 * single attachment message, matching v1's MessageTypeEnum::BookAttachment/
 * StoreAttachment types (previously deferred since v2 had no marketplace to
 * attach from; both book pages and Askıda Kitap listings exist now). */
export async function shareAttachmentAction(
  recipientUsername: string,
  attachmentType: "book" | "store",
  referencedId: number,
): Promise<{ status: boolean; message?: string }> {
  try {
    const userId = await requireUserId();
    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, recipientUsername.trim()))
      .limit(1);
    if (!target) {
      return { status: false, message: "Böyle bir kullanıcı yok." };
    }
    const defaultText = attachmentType === "book" ? "Bu kitaba göz atar mısın?" : "Bu ilana göz atar mısın?";
    await sendMessage(userId, target.id, defaultText, attachmentType, referencedId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteMessageAction(messageId: number): Promise<{ status: boolean; message?: string }> {
  try {
    const userId = await requireUserId();
    await deleteMessage(userId, messageId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteChatAction(otherUsername: string): Promise<{ status: boolean; message?: string }> {
  try {
    const userId = await requireUserId();
    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, otherUsername))
      .limit(1);
    if (!target) return { status: false, message: "Kullanıcı bulunamadı." };
    await deleteChat(userId, target.id);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function deleteAllChatsAction(): Promise<{ status: boolean; message?: string }> {
  try {
    const userId = await requireUserId();
    await deleteAllChats(userId);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

export async function acceptRequestAction(otherUsername: string): Promise<{ status: boolean; message?: string }> {
  try {
    const userId = await requireUserId();
    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, otherUsername))
      .limit(1);
    if (!target) return { status: false, message: "Kullanıcı bulunamadı." };
    await acceptMessageRequest(userId, target.id);
    return { status: true };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}

/**
 * Search results for the thread's own attach-picker ("Mesajların içerisinden
 * kitap seçip gönderme de olmalı") - previously the only way to send a book/
 * store attachment was the "Paylaş" button on that item's own page
 * (shareAttachmentAction below), which meant starting from the item, not
 * from the conversation. Both return the generic {id,label} shape
 * EntitySearchPicker-style pickers expect.
 */
export async function searchBooksForAttachAction(query: string): Promise<{ id: number; label: string }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const results = await searchBooks(trimmed, 8);
  return results.map((b) => ({ id: b.id, label: b.name }));
}

export async function searchStoreForAttachAction(query: string): Promise<{ id: number; label: string }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const rows = await db
    .select({ id: store.id, title: store.title })
    .from(store)
    .where(and(eq(store.isActive, 1), like(store.title, `${trimmed}%`)))
    .orderBy(desc(store.viewCount))
    .limit(8);
  return rows.map((r) => ({ id: r.id, label: r.title }));
}

/** Polled from the client to pick up new incoming messages - matches v1's
 * own polling-based chat refresh (no websocket infra in either version). */
export async function fetchThreadAction(
  otherUsername: string,
): Promise<{ status: boolean; messages?: MessageItem[]; message?: string }> {
  try {
    const userId = await requireUserId();
    const [target] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, otherUsername))
      .limit(1);
    if (!target) return { status: false, message: "Kullanıcı bulunamadı." };
    const page = await getMessages(userId, target.id);
    return { status: true, messages: page.messages };
  } catch (err) {
    return { status: false, message: (err as Error).message };
  }
}
