"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBookFromListAction } from "@/actions/reading-lists";

export function RemoveFromListButton({ listId, bookId }: { listId: number; bookId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await removeBookFromListAction(listId, bookId);
          router.refresh();
        })
      }
      className="text-xs text-muted-foreground hover:text-destructive hover:underline disabled:opacity-50"
    >
      Listeden Çıkar
    </button>
  );
}
