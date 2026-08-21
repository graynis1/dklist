"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteNewsletterSubscriberAction } from "@/actions/newsletter";

export function NewsletterSubscriberActions({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteNewsletterSubscriberAction(id);
            if (result.status) router.refresh();
            else setError(result.message ?? "Silinemedi.");
          })
        }
      >
        Sil
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
