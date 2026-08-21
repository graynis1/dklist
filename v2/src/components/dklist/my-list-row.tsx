"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteReadingListAction } from "@/actions/reading-lists";
import type { UserListSummary } from "@/db/queries/reading-lists";

export function MyListRow({ list }: { list: UserListSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm(`"${list.title}" listesini silmek istediğinizden emin misiniz?`)) return;
    startTransition(async () => {
      await deleteReadingListAction(list.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-4 rounded-lg border border-border p-4">
      <div className="flex-1">
        <Link href={`/liste/${list.slug}`} className="font-medium hover:underline">
          {list.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {list.bookCount} kitap · {list.isPublic ? "Herkese açık" : "Gizli"}
          {list.description && ` · ${list.description}`}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
