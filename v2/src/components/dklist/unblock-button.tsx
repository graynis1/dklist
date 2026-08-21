"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleBlockAction } from "@/app/profil/[username]/actions";

export function UnblockButton({ targetUserId }: { targetUserId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await toggleBlockAction(targetUserId);
          router.refresh();
        })
      }
    >
      Engeli Kaldır
    </Button>
  );
}
