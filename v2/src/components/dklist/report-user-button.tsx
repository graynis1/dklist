"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportUserAction } from "@/app/profil/[username]/actions";

// Matches v1's ActionsComponent fixed reason list exactly (the real v1
// frontend has this modal, but its request body only ever sent `reason` -
// the backend read `reportContent`/`reportType` instead, so every real
// submission there 400'd with "Eksik veri". Fixed here rather than ported
// verbatim: `reason` is sent as both the type discriminant ('user_report')
// and the free-text reason, matching what getAll()'s admin view expects.
const REPORT_REASONS = [
  { value: "spam", label: "Spam / gereksiz içerik" },
  { value: "harassment", label: "Taciz / rahatsız etme" },
  { value: "inappropriate", label: "Uygunsuz içerik" },
  { value: "fake", label: "Sahte hesap" },
  { value: "copyright", label: "Telif hakkı ihlali" },
  { value: "other", label: "Diğer" },
];

export function ReportUserButton({ targetUserId }: { targetUserId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  if (status?.ok) {
    return <p className="text-xs text-muted-foreground">Şikayetiniz gönderildi.</p>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-destructive hover:underline"
      >
        Şikayet Et
      </button>
      {open && (
        <div className="flex w-56 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <Select value={reason || undefined} onValueChange={(v) => setReason(v ?? "")} items={REPORT_REASONS}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Şikayet sebebi seçin" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {status && !status.ok && <p className="text-xs text-destructive">{status.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={!reason || isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await reportUserAction(targetUserId, reason);
                  setStatus({ ok: result.status, message: result.message ?? "Şikayet gönderildi." });
                })
              }
            >
              Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
