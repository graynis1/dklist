"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateReadingListAction } from "@/actions/reading-lists";

/** Real customer report: "Listelerde düzenleme yok" - `/listelerim` (the
 * list management page) already has title/description/visibility edit via
 * MyListRow, but the list's own detail page (/liste/[slug] - what actually
 * opens when browsing lists, not the management page) never had any edit
 * control at all, only a real gap on this specific page, not the feature
 * as a whole. Same inline-edit pattern as MyListRow/ClubManageDescription. */
export function ListManageDetails({
  listId,
  title,
  description,
  isPublic,
}: {
  listId: number;
  title: string;
  description: string | null;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description ?? "");
  const [editPublic, setEditPublic] = useState(isPublic);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateReadingListAction(listId, editTitle, editDescription, editPublic);
      if (result.status) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setEditing(true)}>
        Listeyi Düzenle
      </Button>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-lg border border-border p-3">
      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={150} placeholder="Başlık" />
      <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={500} placeholder="Açıklama (opsiyonel)" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={editPublic} onChange={(e) => setEditPublic(e.target.checked)} />
        Herkese açık
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          Kaydet
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setEditing(false);
            setEditTitle(title);
            setEditDescription(description ?? "");
            setEditPublic(isPublic);
            setError(null);
          }}
        >
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
