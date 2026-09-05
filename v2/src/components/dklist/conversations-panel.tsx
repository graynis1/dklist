"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConversationItem } from "@/components/dklist/conversation-item";
import { deleteChatsAction, deleteAllChatsAction } from "@/app/mesajlar/actions";
import type { ConversationItem as ConversationItemType } from "@/db/queries/messages";
import type { UserDecoration } from "@/db/queries/user-decorations";

/**
 * Real customer report (2026-09-05): "hepsini sil" (delete-all) already
 * existed, but a mail-inbox-style multi-select ("tek tek çoklu seçip
 * silme") did not - the only other option was one X button per
 * conversation. This wraps the conversation list with a select-mode
 * toggle, checkboxes, and a bulk-delete bar, on top of the existing
 * per-item and delete-all actions rather than replacing either.
 */
export function ConversationsPanel({
  conversations,
  activeUsername,
  decorationFor,
}: {
  conversations: ConversationItemType[];
  activeUsername: string | undefined;
  decorationFor: (userId: number) => UserDecoration | undefined;
}) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(username: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function deleteSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size} konuşmayı silmek istediğinizden emin misiniz?`)) return;
    startTransition(async () => {
      await deleteChatsAction([...selected]);
      exitSelectMode();
      router.push("/mesajlar");
      router.refresh();
    });
  }

  function deleteAll() {
    if (!window.confirm("Tüm konuşmaları silmek istediğinizden emin misiniz?")) return;
    startTransition(async () => {
      await deleteAllChatsAction();
      exitSelectMode();
      router.push("/mesajlar");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-2 text-xs">
        {selectMode ? (
          <>
            <span className="text-muted-foreground">{selected.size} seçildi</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={deleteSelected}
                disabled={isPending || selected.size === 0}
                className="font-medium text-destructive disabled:opacity-50"
              >
                Seçilenleri Sil
              </button>
              <button type="button" onClick={exitSelectMode} className="text-muted-foreground hover:text-foreground">
                Vazgeç
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setSelectMode(true)} className="text-muted-foreground hover:text-foreground">
              Seç
            </button>
            <button type="button" onClick={deleteAll} disabled={isPending} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
              Tümünü Sil
            </button>
          </>
        )}
      </div>
      {conversations.map((c) => (
        <ConversationItem
          key={c.otherUserId}
          conversation={c}
          isActive={c.otherUsername === activeUsername}
          decoration={decorationFor(c.otherUserId)}
          selectMode={selectMode}
          selected={selected.has(c.otherUsername)}
          onToggleSelect={() => toggle(c.otherUsername)}
        />
      ))}
    </>
  );
}
