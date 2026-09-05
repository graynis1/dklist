"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Real gap found via customer report, then extended per their follow-up
 * ("her ikisinde de başlık ve açıklama düzenle olmalı" - both name and
 * description should be editable): updateClubDescription() already
 * existed server-side (owner/Admin/Mod only), but the club page never
 * called it, and there was no way to rename a club at all. Same combined
 * inline-edit pattern as ListManageDetails. */
export function ClubManageDetails({
  clubId,
  slug,
  name,
  description,
  updateNameAction,
  updateDescriptionAction,
}: {
  clubId: number;
  slug: string;
  name: string;
  description: string;
  updateNameAction: (clubId: number, slug: string, name: string) => Promise<{ status: boolean; message?: string }>;
  updateDescriptionAction: (clubId: number, slug: string, description: string) => Promise<{ status: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      if (editName !== name) {
        const nameResult = await updateNameAction(clubId, slug, editName);
        if (!nameResult.status) {
          setError(nameResult.message ?? "Güncellenemedi.");
          return;
        }
      }
      if (editDescription !== description) {
        const descResult = await updateDescriptionAction(clubId, slug, editDescription);
        if (!descResult.status) {
          setError(descResult.message ?? "Güncellenemedi.");
          return;
        }
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setEditing(true)}>
        Kulübü Düzenle
      </Button>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-lg border border-border p-3">
      <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={150} placeholder="Kulüp adı" />
      <textarea
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        rows={3}
        maxLength={1000}
        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
      />
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
            setEditName(name);
            setEditDescription(description);
            setError(null);
          }}
        >
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
