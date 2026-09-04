"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Real gap found via customer report: updateClubDescription() already
 * existed server-side (owner/Admin/Mod only), but the club page never
 * called it - a typo or outdated description had no way to be fixed short
 * of deleting and recreating the whole club, matching the same class of
 * gap MyListRow closed for reading lists. */
export function ClubManageDescription({
  clubId,
  slug,
  description,
  updateAction,
}: {
  clubId: number;
  slug: string;
  description: string;
  updateAction: (clubId: number, slug: string, description: string) => Promise<{ status: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateAction(clubId, slug, value);
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
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Açıklamayı Düzenle
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
            setValue(description);
            setError(null);
          }}
        >
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
