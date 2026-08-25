"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { Button } from "@/components/ui/button";
import { acceptRequestAction, deleteChatAction } from "@/app/mesajlar/actions";
import type { ConversationItem as ConversationItemType } from "@/db/queries/messages";

/** "Diğer mesajlar" (message requests) row - a pending first message from
 * someone not yet followed. Accept moves it to the main inbox; decline
 * hides it, same mechanism as deleting a normal conversation. */
export function MessageRequestItem({ request }: { request: ConversationItemType }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      await acceptRequestAction(request.otherUsername);
      router.refresh();
      router.push(`/mesajlar?user=${request.otherUsername}`);
    });
  }

  function decline(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      await deleteChatAction(request.otherUsername);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <Link href={`/mesajlar?user=${request.otherUsername}`} className="flex min-w-0 flex-1 items-center gap-3">
        <EntityAvatar id={request.otherUserId} name={request.otherUsername} size="size-9" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">@{request.otherUsername}</span>
          <span className="truncate text-xs text-muted-foreground">{request.lastMessagePreview ?? ""}</span>
        </div>
      </Link>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" disabled={isPending} onClick={accept}>
          Kabul Et
        </Button>
        <Button size="sm" variant="ghost" disabled={isPending} onClick={decline}>
          Sil
        </Button>
      </div>
    </div>
  );
}
