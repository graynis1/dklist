"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { submitPublisherApplicationAction } from "./actions";

export function PublisherApplicationForm({ rejectedNote }: { rejectedNote: string | null | undefined }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (done) return <p className="rounded-lg bg-primary/10 p-4 text-sm">Başvurunuz alındı, inceleniyor. Sonuçlandığında bildirim alacaksınız.</p>;

  return (
    <div className="flex flex-col gap-3">
      {rejectedNote !== undefined && (
        <p className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">Önceki başvurunuz reddedildi{rejectedNote ? `: ${rejectedNote}` : "."} Tekrar başvurabilirsiniz.</p>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={5}
        maxLength={1000}
        placeholder="Yayınevinizin adı, web siteniz, görevinizi ve size ulaşabileceğimiz e-posta/telefon bilgisini yazın."
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        disabled={isPending || message.trim().length < 10}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await submitPublisherApplicationAction(message, null);
            if (r.status) setDone(true);
            else setError(r.message ?? "Gönderilemedi.");
          })
        }
      >
        {isPending ? "Gönderiliyor…" : "Başvuruyu Gönder"}
      </Button>
    </div>
  );
}
