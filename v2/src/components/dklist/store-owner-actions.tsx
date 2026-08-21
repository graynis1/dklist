"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteStoreAction, markStoreStatusAction } from "@/app/askida-kitap/actions";

export function StoreOwnerActions({ storeId, status }: { storeId: number; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "active" && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markStoreStatusAction(storeId, "completed");
                router.refresh();
              })
            }
          >
            Verildi Olarak İşaretle
          </Button>
        )}
        {status === "active" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await markStoreStatusAction(storeId, "cancelled");
                router.refresh();
              })
            }
          >
            İptal Et
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="text-destructive"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteStoreAction(storeId);
              if (result.status) {
                // router.refresh() before push, not just push - the
                // destination route's Router Cache entry (if already
                // prefetched, e.g. from the header nav link) can otherwise
                // serve a stale pre-delete list for a bit, confirmed via a
                // real test (curl showed correct fresh data immediately;
                // only the client-navigated view was stale).
                router.refresh();
                router.push("/askida-kitap");
              } else {
                setError(result.message ?? "Silinemedi.");
              }
            })
          }
        >
          İlanı Sil
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
