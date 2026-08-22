"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setAdInquiryHandledAction } from "@/actions/ad-inquiry";

export function AdInquiryHandledToggle({ id, initialHandled }: { id: number; initialHandled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setAdInquiryHandledAction(id, !initialHandled);
      if (result.status) router.refresh();
      else setError(result.message ?? "Güncellenemedi.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={initialHandled ? "outline" : "default"} size="sm" disabled={isPending} onClick={toggle}>
        {initialHandled ? "Çözüldü ✓" : "Çözüldü İşaretle"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
