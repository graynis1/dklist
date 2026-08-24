"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircleIcon, XIcon, ArrowLeftIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageThread } from "@/components/dklist/message-thread";
import type { ConversationItem, MessageItem } from "@/db/queries/messages";
import { cn } from "@/lib/utils";

export function FloatingChatPanel({
  currentUserId,
  conversations,
  messageRequests,
  unreadCount,
  fetchThread,
}: {
  currentUserId: number;
  conversations: ConversationItem[];
  messageRequests: ConversationItem[];
  unreadCount: number;
  fetchThread: (otherUserId: number) => Promise<MessageItem[]>;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ConversationItem | null>(null);
  const [activeMessages, setActiveMessages] = useState<MessageItem[]>([]);
  const [isPending, startTransition] = useTransition();

  function openConversation(c: ConversationItem) {
    setActive(c);
    startTransition(async () => {
      const messages = await fetchThread(c.otherUserId);
      setActiveMessages(messages);
    });
  }

  const allItems = [...conversations, ...messageRequests];

  return (
    <div className="fixed right-4 bottom-20 z-40 md:right-6 md:bottom-6">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-popover shadow-xl ring-1 ring-foreground/10">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary"
              >
                <ArrowLeftIcon className="size-4" />
                <span>@{active.otherUsername}</span>
              </button>
            ) : (
              <span className="font-heading text-sm font-medium">Mesajlar</span>
            )}
            <div className="flex items-center gap-1">
              <Link href="/mesajlar" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Tümünü gör
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-1 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Kapat"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {active ? (
              isPending && activeMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Yükleniyor...
                </div>
              ) : (
                <MessageThread
                  key={active.otherUsername}
                  currentUserId={currentUserId}
                  otherUsername={active.otherUsername}
                  initialMessages={activeMessages}
                />
              )
            ) : allItems.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Henüz bir konuşman yok.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {allItems.map((c) => (
                  <li key={c.otherUserId}>
                    <button
                      type="button"
                      onClick={() => openConversation(c)}
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent"
                    >
                      <Avatar className="size-8 shrink-0 text-xs">
                        <AvatarFallback>{c.otherUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">@{c.otherUsername}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastMessagePreview ?? "..."}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {c.unreadCount > 9 ? "9+" : c.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
        )}
        aria-label={open ? "Mesaj kutusunu kapat" : "Mesaj kutusunu aç"}
      >
        {open ? <XIcon className="size-6" /> : <MessageCircleIcon className="size-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
