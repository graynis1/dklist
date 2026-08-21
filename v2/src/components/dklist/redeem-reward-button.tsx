"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { redeemRewardAction, setActiveProfileFrameAction } from "@/actions/point-store";

export function RedeemRewardButton({
  rewardId,
  rewardValue,
  owned,
  isActive,
  canAfford,
}: {
  rewardId: number;
  rewardValue: string;
  owned: boolean;
  isActive: boolean;
  canAfford: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function redeem() {
    setMessage(null);
    startTransition(async () => {
      const result = await redeemRewardAction(rewardId);
      if (!result.status) setMessage(result.message ?? "Alınamadı.");
      else router.refresh();
    });
  }

  function equip() {
    setMessage(null);
    startTransition(async () => {
      const result = await setActiveProfileFrameAction(isActive ? null : rewardValue);
      if (!result.status) setMessage(result.message ?? "Uygulanamadı.");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {owned ? (
        <Button size="sm" variant={isActive ? "default" : "outline"} disabled={isPending} onClick={equip}>
          {isActive ? "Takılı" : "Tak"}
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled={isPending || !canAfford} onClick={redeem}>
          {canAfford ? "Al" : "Yetersiz Puan"}
        </Button>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
