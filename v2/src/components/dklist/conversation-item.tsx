"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { XIcon } from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { deleteChatAction } from "@/app/mesajlar/actions";
import type { ConversationItem as ConversationItemType } from "@/db/queries/messages";
import type { UserDecoration } from "@/db/queries/user-decorations";

export function ConversationItem({
  conversation,
  isActive,
  decoration,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  conversation: ConversationItemType;
  isActive: boolean;
  decoration?: UserDecoration;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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
      {selectMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`@${conversation.otherUsername} konuşmasını seç`}
          className="size-4 shrink-0 accent-primary"
        />
      )}
      <Link
        href={selectMode ? "#" : `/mesajlar?user=${conversation.otherUsername}`}
        onClick={selectMode ? (e) => { e.preventDefault(); onToggleSelect?.(); } : undefined}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <EntityAvatar
          id={conversation.otherUserId}
          name={conversation.otherUsername}
          image={conversation.otherImage}
          size="size-9"
          profileFrame={decoration?.profileFrame}
          frameTier={decoration?.frameTier}
          highestBadge={decoration?.highestBadge}
        />
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
        hidden={selectMode}
        className="shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
        aria-label="Sohbeti sil"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
