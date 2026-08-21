"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getMyListsAction, addBookToListAction } from "@/actions/reading-lists";

export function AddToListButton({ bookId, signedIn }: { bookId: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<{ id: number; title: string }[] | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && lists === null) {
      getMyListsAction().then(setLists);
    }
  }, [open, lists]);

  if (!signedIn) return null;

  return (
    <div className="relative flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Listeye Ekle
      </button>
      {open && (
        <div className="absolute top-full z-10 mt-1 w-64 rounded-md border border-border bg-popover p-3 shadow-md">
          {lists === null ? (
            <p className="text-xs text-muted-foreground">Yükleniyor…</p>
          ) : lists.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Henüz bir listen yok. Önce{" "}
              <a href="/listelerim" className="underline">
                Listelerim
              </a>{" "}
              sayfasından bir liste oluştur.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {lists.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await addBookToListAction(l.id, bookId);
                        setStatus({ ok: result.status, message: result.status ? `"${l.title}" listesine eklendi.` : result.message ?? "Eklenemedi." });
                      })
                    }
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {l.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {status && (
            <p className={`mt-2 text-xs ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
