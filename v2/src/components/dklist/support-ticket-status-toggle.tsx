"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setSupportTicketStatusAction } from "@/actions/support";

export function SupportTicketStatusToggle({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isOpen = status === "open";

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setSupportTicketStatusAction(id, isOpen ? "resolved" : "open");
      if (result.status) router.refresh();
      else setError(result.message ?? "Güncellenemedi.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={isOpen ? "default" : "outline"} size="sm" disabled={isPending} onClick={toggle}>
        {isOpen ? "Çözüldü İşaretle" : "Yeniden Aç"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
