"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reportBookDataErrorAction } from "@/actions/notices";

/** "Hata bildir" - lets any signed-in reader flag a data-quality problem
 * (wrong author, wrong page count, duplicate edition, etc.) on a book page,
 * feeding the same admin moderation queue as user/comment reports. Not
 * gated to signed-in-only visually - a signed-out click just surfaces the
 * server action's own "giriş yapmalısınız" message. */
export function ReportBookErrorButton({ bookId }: { bookId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status?.ok) {
    return <p className="text-xs text-muted-foreground">Bildiriminiz için teşekkürler.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Bu sayfada bir hata mı var? Bildir
      </button>
      {open && (
        <div className="flex w-72 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Örn: yazar adı yanlış, sayfa sayısı hatalı, mükerrer kayıt..."
            rows={3}
            className="w-full rounded-md border border-border bg-background p-1.5 text-sm outline-none focus:border-ring"
          />
          {status && !status.ok && <p className="text-xs text-destructive">{status.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!reason.trim() || isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await reportBookDataErrorAction(bookId, reason);
                  setStatus({ ok: result.status, message: result.message ?? "Bildirim gönderildi." });
                })
              }
            >
              Bildir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
