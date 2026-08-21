"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markWinnerFulfilledAction } from "@/actions/points";

export function FulfillWinnerButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await markWinnerFulfilledAction(id);
          router.refresh();
        })
      }
    >
      Gönderildi Olarak İşaretle
    </Button>
  );
}
