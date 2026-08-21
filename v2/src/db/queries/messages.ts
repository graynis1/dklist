import "server-only";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { chat, message, user, book, store, storePicture, follow } from "@/db/schema";
import { addNotification } from "@/db/queries/notifications";

async function userFollows(followerId: number, followedId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: follow.id })
    .from(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followedId, followedId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Phase 3 chat/messaging - ported from MessageController.php/MessageService.php.
 *
 * Both `chat` and `message` model each conversation from a fixed
 * "firstUser"/"secondUser" perspective set once at creation (whoever sent
 * the first message becomes firstUser) - view/view2 and
 * hiddenForFirstUser/hiddenForSecondUser track each side independently from
 * then on. Every query below has to resolve "am I first or second in this
 * chat" per-call rather than assuming a fixed role, exactly like v1 does.
 */

export interface ConversationItem {
  otherUserId: number;
  otherUsername: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export async function getConversations(userId: number): Promise<ConversationItem[]> {
  const rows = await db
    .select({
      id: chat.id,
      firstUserId: chat.firstUserId,
      secondUserId: chat.secondUserId,
      isRequest: chat.isRequest,
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
      hiddenForFirstUser: chat.hiddenForFirstUser,
      hiddenForSecondUser: chat.hiddenForSecondUser,
      otherUsername: user.username,
    })
    .from(chat)
    .innerJoin(
      user,
      or(
        and(eq(chat.firstUserId, userId), eq(user.id, chat.secondUserId)),
        and(eq(chat.secondUserId, userId), eq(user.id, chat.firstUserId)),
      ),
    )
    .where(or(eq(chat.firstUserId, userId), eq(chat.secondUserId, userId)))
    .orderBy(desc(chat.lastMessageAt), desc(chat.id));

  const conversations: ConversationItem[] = [];

  for (const row of rows) {
    const isFirst = row.firstUserId === userId;
    if (isFirst ? row.hiddenForFirstUser : row.hiddenForSecondUser) continue;
    // A pending message-request only sits outside the main inbox from the
    // RECIPIENT's side - the sender always sees their own sent message here
    // like any other conversation.
    if (!isFirst && row.isRequest) continue;

    const [{ n: unreadCount }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(message)
      .where(and(eq(message.chatId, row.id), eq(isFirst ? message.view : message.view2, 0)));

    conversations.push({
      otherUserId: isFirst ? row.secondUserId : row.firstUserId,
      otherUsername: row.otherUsername,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      unreadCount,
    });
  }

  return conversations;
}

/**
 * "Diğer mesajlar" (message requests) - customer's ask: a first message
 * from someone you don't follow lands in a separate folder, Instagram-DM
 * style. Only ever populated from the RECIPIENT's side of a pending chat.
 */
export async function getMessageRequests(userId: number): Promise<ConversationItem[]> {
  const rows = await db
    .select({
      id: chat.id,
      firstUserId: chat.firstUserId,
      lastMessagePreview: chat.lastMessagePreview,
      lastMessageAt: chat.lastMessageAt,
      otherUsername: user.username,
    })
    .from(chat)
    .innerJoin(user, eq(user.id, chat.firstUserId))
    .where(and(eq(chat.secondUserId, userId), eq(chat.isRequest, 1), eq(chat.hiddenForSecondUser, 0)))
    .orderBy(desc(chat.lastMessageAt), desc(chat.id));

  const requests: ConversationItem[] = [];
  for (const row of rows) {
    const [{ n: unreadCount }] = await db
      .select({ n: sql<number>`count(*)` })
      .from(message)
      .where(and(eq(message.chatId, row.id), eq(message.view2, 0)));

    requests.push({
      otherUserId: row.firstUserId,
      otherUsername: row.otherUsername,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      unreadCount,
    });
  }
  return requests;
}

export async function getUnreadRequestCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(
      and(
        eq(chat.secondUserId, userId),
        eq(chat.isRequest, 1),
        eq(message.view2, 0),
        eq(chat.hiddenForSecondUser, 0),
      ),
    );
  return row?.n ?? 0;
}

/** Explicitly accept a message request without necessarily replying yet -
 * moves it into the main inbox. Replying also accepts it (see sendMessage). */
export async function acceptMessageRequest(userId: number, otherUserId: number): Promise<void> {
  const chatRow = await findChatBetween(userId, otherUserId);
  if (!chatRow || chatRow.secondUserId !== userId) {
    throw new Error("Mesaj isteği bulunamadı.");
  }
  await db.update(chat).set({ isRequest: 0 }).where(eq(chat.id, chatRow.id));
}

/** Matches v1's getUnviewedMessageCount() exactly: two single-COUNT queries
 * (as-first-user unread + as-second-user unread), excluding chats the user
 * has hidden on their own side - otherwise a deleted conversation's unread
 * badge would stick forever since nothing would ever clear it. */
export async function getUnreadMessageCount(userId: number): Promise<number> {
  const [asFirst, asSecond] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)` })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(and(eq(chat.firstUserId, userId), eq(message.view, 0), eq(chat.hiddenForFirstUser, 0))),
    // Pending message requests deliberately don't count toward the main
    // unread badge - matches the whole point of splitting them out, a
    // stranger's message shouldn't read as urgent as a real conversation.
    db
      .select({ n: sql<number>`count(*)` })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.secondUserId, userId),
          eq(message.view2, 0),
          eq(chat.hiddenForSecondUser, 0),
          eq(chat.isRequest, 0),
        ),
      ),
  ]);
  return asFirst[0].n + asSecond[0].n;
}

export type MessageType = "text" | "book" | "store";

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
  type: MessageType;
  attachment: MessageAttachment | null;
}

export interface MessagesPage {
  messages: MessageItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

async function findChatBetween(userA: number, userB: number) {
  const [row] = await db
    .select()
    .from(chat)
    .where(
      or(
        and(eq(chat.firstUserId, userA), eq(chat.secondUserId, userB)),
        and(eq(chat.firstUserId, userB), eq(chat.secondUserId, userA)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Deliberately uncached - marks messages as read as a side effect (matching
 * v1's exact behavior: opening a thread marks its unread messages as
 * viewed), so this must always run against live data, never a cached view.
 */
export async function getMessages(
  currentUserId: number,
  otherUserId: number,
  cursor?: number,
  limit = 40,
): Promise<MessagesPage> {
  const chatRow = await findChatBetween(currentUserId, otherUserId);
  // No Chat row yet means no message has ever been sent between these two -
  // v1's own comment is explicit this is not an error state (e.g. the first
  // time you message someone from their profile), just an empty thread.
  if (!chatRow) return { messages: [], hasMore: false, nextCursor: null };

  const isFirst = chatRow.firstUserId === currentUserId;

  const rows = await db
    .select({
      id: message.id,
      text: message.message,
      senderUserId: message.senderUserId,
      createdAt: message.createdAt,
      view: message.view,
      view2: message.view2,
      hiddenForSender: message.hiddenForSender,
      type: message.type,
      attachmentSnapshot: message.attachmentSnapshot,
    })
    .from(message)
    .where(
      cursor
        ? and(eq(message.chatId, chatRow.id), lt(message.id, cursor))
        : eq(message.chatId, chatRow.id),
    )
    .orderBy(desc(message.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const visibleRows = pageRows.filter(
    (r) => !(r.hiddenForSender && r.senderUserId === currentUserId),
  );

  const unreadIds = visibleRows
    .filter((r) => (isFirst ? !r.view : !r.view2))
    .map((r) => r.id);

  if (unreadIds.length > 0) {
    await db
      .update(message)
      .set(isFirst ? { view: 1 } : { view2: 1 })
      .where(and(eq(message.chatId, chatRow.id), or(...unreadIds.map((id) => eq(message.id, id)))));
  }

  const messages: MessageItem[] = visibleRows
    .map((r) => ({
      id: r.id,
      text: r.text,
      senderId: r.senderUserId ?? (isFirst ? currentUserId : otherUserId),
      createdAt: r.createdAt,
      type: (r.type as MessageType) ?? "text",
      attachment: r.attachmentSnapshot ? (JSON.parse(r.attachmentSnapshot) as MessageAttachment) : null,
    }))
    .reverse(); // oldest-first, matching v1's array_reverse($messages)

  const nextCursor = hasMore && messages.length > 0 ? messages[0].id : null;

  return { messages, hasMore, nextCursor };
}

export interface SendMessageResult {
  id: number;
  text: string;
  senderId: number;
  createdAt: string | null;
  type: MessageType;
  attachment: MessageAttachment | null;
}

/**
 * v1's MessageService::send() builds a denormalized JSON `attachmentSnapshot`
 * at send-time (not a live join) - the attachment card in an old message
 * still shows the book/store's name/image as they were when shared, even if
 * the book gets merged/deleted or the listing is edited/removed later.
 */
async function buildAttachment(
  type: MessageType,
  referencedId: number,
): Promise<{ snapshot: MessageAttachment; previewText: string } | null> {
  if (type === "book") {
    const [row] = await db
      .select({ id: book.id, name: book.name, slug: book.slug })
      .from(book)
      .where(eq(book.id, referencedId))
      .limit(1);
    if (!row) return null;
    return {
      snapshot: { id: row.id, title: row.name, slug: row.slug, image: `/kapak/${row.id}` },
      previewText: "📖 Kitap paylaştı",
    };
  }
  if (type === "store") {
    const [row] = await db
      .select({ id: store.id, title: store.title, slug: store.slug, price: store.price })
      .from(store)
      .where(eq(store.id, referencedId))
      .limit(1);
    if (!row) return null;
    const [pic] = await db
      .select({ imageName: storePicture.imageName })
      .from(storePicture)
      .where(eq(storePicture.advertId, row.id))
      .limit(1);
    return {
      snapshot: {
        id: row.id,
        title: row.title,
        slug: row.slug,
        price: row.price,
        image: pic ? `/api/store-image/${pic.imageName}` : null,
      },
      previewText: "🏷️ İlan paylaştı",
    };
  }
  return null;
}

export async function sendMessage(
  senderId: number,
  receiverId: number,
  text: string,
  attachmentType: MessageType = "text",
  referencedId?: number,
): Promise<SendMessageResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Mesaj boş olamaz.");
  }
  if (senderId === receiverId) {
    throw new Error("Kendine mesaj gönderemezsin.");
  }

  let attachment: MessageAttachment | null = null;
  let attachmentPreview: string | null = null;
  if (attachmentType !== "text" && referencedId) {
    const built = await buildAttachment(attachmentType, referencedId);
    if (built) {
      attachment = built.snapshot;
      attachmentPreview = built.previewText;
    }
  }
  const effectiveType: MessageType = attachment ? attachmentType : "text";

  let chatRow = await findChatBetween(senderId, receiverId);
  let isFirst: boolean;

  if (!chatRow) {
    isFirst = true;
    // A first message from someone the recipient doesn't follow starts as a
    // pending "request" (customer's "Diğer mesajlar" ask) - it only ever
    // affects the RECIPIENT's inbox, the sender always sees it normally.
    const receiverFollowsSender = await userFollows(receiverId, senderId);
    const [result] = await db.insert(chat).values({
      firstUserId: senderId,
      secondUserId: receiverId,
      isRequest: receiverFollowsSender ? 0 : 1,
      hiddenForFirstUser: 0,
      hiddenForSecondUser: 0,
    });
    const [inserted] = await db.select().from(chat).where(eq(chat.id, result.insertId)).limit(1);
    chatRow = inserted;
  } else {
    isFirst = chatRow.firstUserId === senderId;
    // The recipient replying is treated as accepting the request, matching
    // Instagram's own behavior - moves the whole thread into the main inbox.
    if (!isFirst && chatRow.isRequest) {
      await db.update(chat).set({ isRequest: 0 }).where(eq(chat.id, chatRow.id));
      chatRow.isRequest = 0;
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const preview = (attachmentPreview ?? trimmed).slice(0, 140);

  const [msgResult] = await db.insert(message).values({
    chatId: chatRow.id,
    message: trimmed,
    sender: String(senderId),
    receiver: String(receiverId),
    senderUserId: senderId,
    receiverUserId: receiverId,
    view: isFirst ? 1 : 0,
    view2: isFirst ? 0 : 1,
    createdAt: now,
    type: effectiveType,
    attachmentSnapshot: attachment ? JSON.stringify(attachment) : null,
    referencedBookId: effectiveType === "book" ? referencedId : null,
    referencedStoreId: effectiveType === "store" ? referencedId : null,
    hiddenForSender: 0,
  });

  // A new message is a real new interaction even if either side had hidden
  // the conversation - both become visible again, matching v1's send().
  await db
    .update(chat)
    .set({ lastMessageAt: now, lastMessagePreview: preview, hiddenForFirstUser: 0, hiddenForSecondUser: 0 })
    .where(eq(chat.id, chatRow.id));

  const [sender] = await db.select({ username: user.username }).from(user).where(eq(user.id, senderId)).limit(1);
  if (sender) {
    const notifyText = trimmed.length > 60 ? `${trimmed.slice(0, 60)}...` : trimmed;
    await addNotification(
      receiverId,
      senderId,
      `Sana bir mesaj gönderdi: "${notifyText}"`,
      `Sent you a message: "${notifyText}"`,
    );
  }

  return { id: msgResult.insertId, text: trimmed, senderId, createdAt: now, type: effectiveType, attachment };
}

export async function deleteMessage(userId: number, messageId: number): Promise<void> {
  const [row] = await db
    .select({ senderUserId: message.senderUserId })
    .from(message)
    .where(eq(message.id, messageId))
    .limit(1);

  if (!row || row.senderUserId !== userId) {
    throw new Error("Sadece kendi mesajını silebilirsin.");
  }

  await db.update(message).set({ hiddenForSender: 1 }).where(eq(message.id, messageId));
}

export async function deleteChat(userId: number, otherUserId: number): Promise<void> {
  const chatRow = await findChatBetween(userId, otherUserId);
  if (!chatRow) {
    throw new Error("Sohbet bulunamadı.");
  }

  const isFirst = chatRow.firstUserId === userId;
  await db
    .update(chat)
    .set(isFirst ? { hiddenForFirstUser: 1 } : { hiddenForSecondUser: 1 })
    .where(eq(chat.id, chatRow.id));
}
