"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveBookSubmissionAction, rejectBookSubmissionAction } from "@/app/admin/kitap-onaylari/actions";

export function BookSubmissionActions({ bookId }: { bookId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ status: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.status) router.refresh();
      else setError(result.message ?? "İşlem başarısız.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => approveBookSubmissionAction(bookId))}>
          Onayla
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={isPending}
          onClick={() => run(() => rejectBookSubmissionAction(bookId))}
        >
          Reddet
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
