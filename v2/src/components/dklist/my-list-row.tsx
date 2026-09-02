"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteReadingListAction, updateReadingListAction } from "@/actions/reading-lists";
import type { UserListSummary } from "@/db/queries/reading-lists";

/** Real gap found via customer report: updateReadingListAction() already
 * existed server-side (title/description/visibility), but no UI ever
 * called it - only delete was reachable, so a typo in a list's name or
 * description meant deleting and recreating the whole list rather than
 * fixing it. */
export function MyListRow({ list }: { list: UserListSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [isPublic, setIsPublic] = useState(list.isPublic);
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(`"${list.title}" listesini silmek istediğinizden emin misiniz?`)) return;
    startTransition(async () => {
      await deleteReadingListAction(list.id);
      router.refresh();
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateReadingListAction(list.id, title, description, isPublic);
      if (result.status) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="Başlık" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Açıklama (opsiyonel)" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Herkese açık
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" disabled={isPending} onClick={save}>
            Kaydet
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setEditing(false);
              setTitle(list.title);
              setDescription(list.description ?? "");
              setIsPublic(list.isPublic);
              setError(null);
            }}
          >
            Vazgeç
          </Button>
        </div>
      </li>
    );
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
      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setEditing(true)}>
        Düzenle
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
