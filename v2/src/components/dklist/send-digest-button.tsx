"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendWeeklyDigestsNowAction } from "@/app/admin/haftalik-ozet/actions";

export function SendDigestButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await sendWeeklyDigestsNowAction();
            setResult({
              ok: r.status,
              message: r.status ? `${r.sent} kullanıcıya gönderildi, ${r.skipped} kullanıcı raporlanacak bir şey olmadığı için atlandı.` : (r.message ?? "Gönderilemedi."),
            });
          })
        }
        className="w-fit"
      >
        {isPending ? "Gönderiliyor…" : "Şimdi Gönder"}
      </Button>
      {result && <p className={`text-sm ${result.ok ? "text-muted-foreground" : "text-destructive"}`}>{result.message}</p>}
    </div>
  );
}
