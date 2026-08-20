"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllReadAction, deleteNotificationAction } from "@/app/bildirimler/actions";
import type { NotificationItem } from "@/db/queries/notifications";

export function NotificationsList({ initialItems }: { initialItems: NotificationItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();

  const hasUnread = items.some((n) => !n.view);

  function markAllRead() {
    startTransition(async () => {
      const result = await markAllReadAction();
      if (result.status) {
        setItems((prev) => prev.map((n) => ({ ...n, view: true })));
      }
    });
  }

  function remove(id: number) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      await deleteNotificationAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {hasUnread && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={isPending}
          onClick={markAllRead}
        >
          Tümünü okundu işaretle
        </Button>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground">Henüz bildiriminiz yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
                n.view ? "border-border" : "border-primary/40 bg-secondary/40"
              }`}
            >
              <span>
                <Link href={`/profil/${n.senderUsername}`} className="font-medium hover:underline">
                  @{n.senderUsername}
                </Link>
                <span className="ml-1">{n.contentTr}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(n.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                aria-label="Bildirimi sil"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
