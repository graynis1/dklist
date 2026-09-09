"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { sendBulkMailAction } from "@/app/admin/kullanicilar/actions";
import type { UserAdminFilters } from "@/db/queries/user-admin";

/**
 * Customer's ask: "demografik sort/filtre + toplu mail" - sends to every
 * user matching the panel's CURRENT search+filters (sex/city), not just
 * the currently visible page. See sendBulkMailToFilteredUsers()'s own
 * hard recipient cap.
 */
export function BulkMailDialog({
  search,
  filters,
  totalMatching,
}: {
  search: string;
  filters: UserAdminFilters;
  totalMatching: number;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ sent: number; failed: number; total: number; capped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendBulkMailAction(search, filters, subject, body);
      if (res.status) {
        setResult({ sent: res.sent ?? 0, failed: res.failed ?? 0, total: res.total ?? 0, capped: res.capped ?? false });
        setSubject("");
        setBody("");
      } else {
        setError(res.message ?? "Gönderilemedi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>Toplu Mail Gönder ({totalMatching})</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Toplu Mail Gönder</DialogTitle>
          <DialogDescription>
            Şu anki arama/filtre kriterlerine uyan {totalMatching} kullanıcıya gönderilecek (sayfadaki değil, tüm eşleşenlere).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mesaj (HTML desteklenir)"
            className="min-h-32 rounded-md border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {result && (
            <p className="text-xs text-muted-foreground">
              Gönderildi: {result.sent}/{result.total}
              {result.failed > 0 && `, başarısız: ${result.failed}`}
              {result.capped && " (kayıt sayısı üst sınırı aşıyor, sadece ilk kısma gönderildi)"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" disabled={isPending || !subject.trim() || !body.trim()} onClick={send}>
            {isPending ? "Gönderiliyor..." : "Gönder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
