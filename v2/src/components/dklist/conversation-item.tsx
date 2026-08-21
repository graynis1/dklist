"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { deleteChatAction } from "@/app/mesajlar/actions";
import type { ConversationItem as ConversationItemType } from "@/db/queries/messages";

export function ConversationItem({
  conversation,
  isActive,
}: {
  conversation: ConversationItemType;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      await deleteChatAction(conversation.otherUsername);
      if (isActive) {
        router.push("/mesajlar");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className={`group flex items-center gap-3 p-3 transition-colors hover:bg-accent ${isActive ? "bg-accent" : ""}`}>
      <Link href={`/mesajlar?user=${conversation.otherUsername}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-9 text-sm">
          <AvatarFallback>{conversation.otherUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">@{conversation.otherUsername}</span>
          <span className="truncate text-xs text-muted-foreground">
            {conversation.lastMessagePreview ?? ""}
          </span>
        </div>
        {conversation.unreadCount > 0 && (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={remove}
        disabled={isPending}
        className="shrink-0 text-xs text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
        aria-label="Sohbeti sil"
      >
        ✕
      </button>
    </div>
  );
}
