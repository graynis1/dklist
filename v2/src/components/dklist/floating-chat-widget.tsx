import { Suspense } from "react";
import { auth } from "@/auth";
import { getConversations, getMessageRequests, getMessages, getUnreadMessageCount } from "@/db/queries/messages";
import { FloatingChatPanel } from "@/components/dklist/floating-chat-panel";

/**
 * "Bionluk gibi" (maintainer's explicit reference) - a persistent bottom-
 * right chat launcher, separate from the full /mesajlar page (which stays
 * as the "real" inbox for anyone who wants the full list/search). Global in
 * the root layout, same Suspense-isolation pattern as MessageBell/
 * AuthStatus (auth() reads cookies() per-request).
 */
export function FloatingChatWidget() {
  return (
    <Suspense fallback={null}>
      <FloatingChatWidgetContent />
    </Suspense>
  );
}

async function FloatingChatWidgetContent() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const currentUserId = Number(session.user.id);

  const [conversations, messageRequests, unreadCount] = await Promise.all([
    getConversations(currentUserId),
    getMessageRequests(currentUserId),
    getUnreadMessageCount(currentUserId),
  ]);

  return (
    <FloatingChatPanel
      currentUserId={currentUserId}
      conversations={conversations}
      messageRequests={messageRequests}
      unreadCount={unreadCount}
      fetchThread={fetchThreadForWidget}
    />
  );
}

// Bound server action - lets the client panel lazily load a thread's
// messages only once a conversation is actually opened, without needing
// its own route/API handler.
async function fetchThreadForWidget(otherUserId: number) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return [];
  const currentUserId = Number(session.user.id);
  const page = await getMessages(currentUserId, otherUserId);
  return page.messages;
}
