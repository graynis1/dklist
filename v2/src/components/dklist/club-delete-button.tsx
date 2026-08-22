"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface ActionResult {
  status: boolean;
  message?: string;
}

export function ClubDeleteButton({
  clubId,
  deleteAction,
}: {
  clubId: number;
  deleteAction: (clubId: number) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Bu kulübü kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
          startTransition(async () => {
            setError(null);
            const result = await deleteAction(clubId);
            if (result.status) {
              router.push("/kulupler");
            } else {
              setError(result.message ?? "Silinemedi.");
            }
          });
        }}
      >
        Kulübü Sil
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
