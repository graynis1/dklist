"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteAllChatsAction } from "@/app/mesajlar/actions";

/** v1 parity gap found via customer report: v1's inbox had a "tümünü
 * sil" option, v2 only ever had per-conversation delete. */
export function DeleteAllChatsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function removeAll() {
    if (!window.confirm("Tüm konuşmaları silmek istediğinizden emin misiniz?")) return;
    startTransition(async () => {
      await deleteAllChatsAction();
      router.push("/mesajlar");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={removeAll}
      disabled={isPending}
      className="p-3 text-left text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      Tümünü sil
    </button>
  );
}
