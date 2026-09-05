"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recordWeeklyWinnerAction } from "@/actions/points";
import { BookLinkPicker } from "@/components/dklist/book-link-picker";

/**
 * Real customer report (2026-09-05): "Haftalık kazanan kısmını da
 * denedim orada da sanırım kitaplar sekmesi açılmadı onun sıralama ID
 * numarasını buraya yazınca kitap görselini çekip..." - this used to be
 * a bare numeric book-ID text field (the admin had to go find the ID
 * elsewhere first), not an actual picker. Reuses BookLinkPicker (the
 * same real search-with-cover component Askıda Kitap's create form
 * uses) instead of a raw ID input.
 */
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
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const formData = new FormData(formRef.current!);
    const rawBookId = formData.get("bookId");
    const bookId = rawBookId ? Number(rawBookId) : null;
    startTransition(async () => {
      const result = await recordWeeklyWinnerAction(yearWeek, userId, points, bookId);
      if (result.status) {
        router.refresh();
        setOpen(false);
      } else {
        setError(result.message ?? "Kaydedilemedi.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        Kazanan Olarak Kaydet
      </Button>
      {open && (
        <form ref={formRef} className="flex w-72 flex-col gap-2 rounded-md border border-border bg-popover p-3">
          <p className="text-xs text-muted-foreground">Hediye edilecek kitap (opsiyonel, boş bırakılabilir)</p>
          <BookLinkPicker />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="button" size="sm" disabled={isPending} onClick={submit}>
            Onayla
          </Button>
        </form>
      )}
    </div>
  );
}
