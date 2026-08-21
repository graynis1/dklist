"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleParticipationAction } from "@/actions/book-of-month";

export function ParticipateButton({ bookOfMonthId, initialJoined, signedIn }: { bookOfMonthId: number; initialJoined: boolean; signedIn: boolean }) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) return null;

  return (
    <Button
      size="sm"
      variant={joined ? "outline" : "default"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleParticipationAction(bookOfMonthId);
          if (result.status && result.joined !== undefined) {
            setJoined(result.joined);
            router.refresh();
          }
        })
      }
    >
      {joined ? "Katılıyorum ✓" : "Katılıyorum"}
    </Button>
  );
}
