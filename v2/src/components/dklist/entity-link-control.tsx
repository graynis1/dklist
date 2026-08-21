"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";

/**
 * Admin panel control to link a user account to a catalog entity (writer/
 * publisher) - a real pre-existing gap found while building Yazarhane's
 * writer-link: updateUserPublisherAction already existed but had NO UI
 * anywhere calling it, only ever reachable by hand-crafting a request.
 * Fixed both at once with this one shared control.
 */
export function EntityLinkControl({
  label,
  currentId,
  currentName,
  searchAction,
  linkAction,
}: {
  label: string;
  currentId: number | null;
  currentName: string | null;
  searchAction: (query: string) => Promise<{ id: number; label: string }[]>;
  linkAction: (id: number | null) => Promise<{ status: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    const raw = String(formData.get("entityId") ?? "");
    const id = raw ? Number(raw.split(",")[0]) : null;
    startTransition(async () => {
      const result = await linkAction(id);
      if (result.status) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message ?? "Bağlanamadı.");
      }
    });
  }

  function unlink() {
    setError(null);
    startTransition(async () => {
      const result = await linkAction(null);
      if (result.status) router.refresh();
      else setError(result.message ?? "Kaldırılamadı.");
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {label}: {currentName ?? "bağlı değil"}
        </span>
        <button type="button" className="underline hover:text-foreground" onClick={() => setEditing(true)}>
          değiştir
        </button>
        {currentId && (
          <button type="button" disabled={isPending} className="text-destructive underline" onClick={unlink}>
            kaldır
          </button>
        )}
        {error && <span className="text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <form action={submit} className="flex items-end gap-2">
      <div className="w-56">
        <EntitySearchPicker name="entityId" label={label} searchAction={searchAction} />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        Kaydet
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Vazgeç
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
