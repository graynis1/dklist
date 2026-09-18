"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveStoreListingAction, rejectStoreListingAction } from "@/app/admin/ilan-onaylari/actions";

export function StoreListingActions({ storeId }: { storeId: number }) {
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
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => run(() => approveStoreListingAction(storeId))}>
          Onayla
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={isPending}
          onClick={() => run(() => rejectStoreListingAction(storeId))}
        >
          Reddet
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
