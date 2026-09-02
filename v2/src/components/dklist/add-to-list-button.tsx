"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyListsAction, addBookToListAction, createReadingListAction } from "@/actions/reading-lists";

/**
 * Real bug found via customer report: this only ever offered "create a
 * list" when the user had zero lists at all - once they had one, the
 * picker showed just that list forever, with no way to create a second
 * one short of leaving the book page and going to /listelerim. A "+ Yeni
 * liste" option is now always available regardless of how many lists
 * already exist, and creating one here immediately adds this book to it
 * too - the whole point of reaching this picker from a book page.
 */
export function AddToListButton({ bookId, signedIn }: { bookId: number; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<{ id: number; title: string }[] | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && lists === null) {
      getMyListsAction().then(setLists);
    }
  }, [open, lists]);

  if (!signedIn) return null;

  function createAndAdd() {
    const title = newTitle.trim();
    if (!title) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("isPublic", "on");
      const created = await createReadingListAction(formData);
      if (!created.status) {
        setStatus({ ok: false, message: created.message ?? "Liste oluşturulamadı." });
        return;
      }
      const refreshed = await getMyListsAction();
      setLists(refreshed);
      const newList = refreshed.find((l) => l.title === title);
      if (newList) {
        const result = await addBookToListAction(newList.id, bookId);
        setStatus({ ok: result.status, message: result.status ? `"${title}" listesine eklendi.` : result.message ?? "Eklenemedi." });
      }
      setCreating(false);
      setNewTitle("");
    });
  }

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
          ) : (
            <>
              {lists.length > 0 && (
                <ul className="mb-2 flex flex-col gap-1">
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
              {creating ? (
                <div className="flex flex-col gap-2 border-t border-border pt-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Yeni liste başlığı"
                    maxLength={150}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={isPending || !newTitle.trim()} onClick={createAndAdd}>
                      Oluştur ve Ekle
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setCreating(false)}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-accent ${lists.length > 0 ? "border-t border-border pt-2" : ""}`}
                >
                  + Yeni liste oluştur
                </button>
              )}
            </>
          )}
          {status && (
            <p className={`mt-2 text-xs ${status.ok ? "text-muted-foreground" : "text-destructive"}`}>{status.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
