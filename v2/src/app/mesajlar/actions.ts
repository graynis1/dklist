"use server";

import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import {
  sendMessage,
  deleteMessage,
  deleteChat,
  getMessages,
  acceptMessageRequest,
  type MessageItem,
  type MessageType,
} from "@/db/queries/messages";

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
