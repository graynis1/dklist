"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reportMissingEntityAction } from "@/actions/notices";
import type { MissingEntityType } from "@/db/queries/notices";

const LABELS: Record<MissingEntityType, string> = {
  book: "kitap",
  writer: "yazar",
  publisher: "yayınevi",
  translator: "çevirmen",
};

/**
 * Real customer ask (2026-09-10): a visible way, right next to a search box,
 * to report a book/writer/publisher/translator that's genuinely missing
 * from the catalog - "kitabın internet üzerindeki bir yerden linki
 * eklenmeli doğruluğun kontrolü için ona göre giriş yapılır" (a source
 * link is required so the actual addition still goes through admin
 * review, not a direct self-service add). Same lightweight
 * open/close-inline pattern as ReportBookErrorButton, generalized across
 * all four entity types via `entityType`.
 */
export function ReportMissingEntityButton({ entityType }: { entityType: MissingEntityType }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status?.ok) {
    return <p className="text-xs text-muted-foreground">Bildiriminiz için teşekkürler, incelenecek.</p>;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Aradığın {LABELS[entityType]} listede yok mu? Bildir
      </button>
      {open && (
        <div className="flex w-80 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Eksik ${LABELS[entityType]} adı`} />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Kaynak bağlantı (https://...)" />
          {status && !status.ok && <p className="text-xs text-destructive">{status.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!name.trim() || !url.trim() || isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await reportMissingEntityAction(entityType, name, url);
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
