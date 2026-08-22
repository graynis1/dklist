"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";

interface ActionResult {
  status: boolean;
  message?: string;
}
interface SearchOption {
  id: number;
  label: string;
}

export function ClubManageBook({
  clubId,
  slug,
  searchAction,
  updateAction,
}: {
  clubId: number;
  slug: string;
  searchAction: (query: string) => Promise<SearchOption[]>;
  updateAction: (clubId: number, slug: string, bookId: number | null) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(true)}>
        Kitabı Değiştir
      </Button>
    );
  }

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      action={(formData: FormData) => {
        const bookIdRaw = String(formData.get("bookId") ?? "").trim();
        startTransition(async () => {
          setError(null);
          const result = await updateAction(clubId, slug, bookIdRaw ? Number(bookIdRaw) : null);
          if (result.status) {
            setOpen(false);
            router.refresh();
          } else {
            setError(result.message ?? "Güncellenemedi.");
          }
        });
      }}
    >
      <EntitySearchPicker name="bookId" label="Yeni kitap seç" searchAction={searchAction} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Kaydet
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Vazgeç
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
