"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveNoticeAction, deleteNoticeAction } from "@/actions/notices";

export function NoticeActions({ noticeId, isResolved }: { noticeId: number; isResolved: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {!isResolved && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await resolveNoticeAction(noticeId);
                if (result.status) router.refresh();
                else setError(result.message ?? "İşlem başarısız.");
              })
            }
          >
            Çözüldü İşaretle
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteNoticeAction(noticeId);
              if (result.status) router.refresh();
              else setError(result.message ?? "Silinemedi.");
            })
          }
        >
          Sil
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
