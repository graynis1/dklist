"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordWeeklyWinnerAction } from "@/actions/points";

export function RecordWinnerForm({
  yearWeek,
  userId,
  points,
}: {
  yearWeek: string;
  userId: number;
  points: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bookId, setBookId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        Kazanan Olarak Kaydet
      </Button>
      {open && (
        <div className="flex w-64 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Hediye edilecek kitabın ID&apos;si (kitap sayfasının admin panelinden bulunabilir, boş bırakılabilir)
            <Input value={bookId} onChange={(e) => setBookId(e.target.value)} placeholder="Örn. 42" type="number" />
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await recordWeeklyWinnerAction(
                  yearWeek,
                  userId,
                  points,
                  bookId.trim() ? Number(bookId.trim()) : null,
                );
                if (result.status) {
                  router.refresh();
                  setOpen(false);
                } else {
                  setError(result.message ?? "Kaydedilemedi.");
                }
              })
            }
          >
            Onayla
          </Button>
        </div>
      )}
    </div>
  );
}
