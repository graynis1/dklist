"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { approveVerificationAction, rejectVerificationAction } from "@/app/admin/dogrulama/actions";
import type { PendingVerificationItem } from "@/db/queries/identity-verification";

export function VerificationRequestRow({ item }: { item: PendingVerificationItem }) {
  const [resolved, setResolved] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (resolved) return null;

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await approveVerificationAction(item.id);
      if (result.status) setResolved(true);
      else setError(result.message ?? "İşlem başarısız.");
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectVerificationAction(item.id, note);
      if (result.status) setResolved(true);
      else setError(result.message ?? "İşlem başarısız.");
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/profil/${item.username}`} className="font-medium hover:underline">
            @{item.username}
          </Link>
          {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
          <p className="text-xs text-muted-foreground/70">{item.submittedAt}</p>
        </div>
        <a
          href={`/api/identity-document/${item.documentImage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/identity-document/${item.documentImage}`}
            alt="Kimlik belgesi"
            className="h-20 w-32 rounded-md border border-border object-cover"
          />
        </a>
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
