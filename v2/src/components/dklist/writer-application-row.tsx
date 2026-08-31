"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { approveWriterApplicationAction, rejectWriterApplicationAction } from "@/app/admin/yazar-basvurulari/actions";
import type { PendingWriterApplication } from "@/db/queries/yazarhane";

export function WriterApplicationRow({ item }: { item: PendingWriterApplication }) {
  const [resolved, setResolved] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resolved) return null;

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await approveWriterApplicationAction(item.id);
      if (result.status) setResolved(true);
      else setError(result.message ?? "İşlem başarısız.");
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectWriterApplicationAction(item.id, note);
      if (result.status) setResolved(true);
      else setError(result.message ?? "İşlem başarısız.");
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div>
        <Link href={`/profil/${item.username}`} className="font-medium hover:underline">
          @{item.username}
        </Link>
        {item.proposedWriterName && (
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            Katalog eşleşmesi: {item.proposedWriterName}
          </span>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
        <p className="text-xs text-muted-foreground/70">{item.submittedAt}</p>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Red sebebi (kullanıcıya bildirilecek)"
            rows={2}
            className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={isPending} onClick={reject}>
              Reddi Onayla
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRejecting(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={isPending} onClick={approve}>
            Onayla
          </Button>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setRejecting(true)}>
            Reddet
          </Button>
        </div>
      )}
    </li>
  );
}
