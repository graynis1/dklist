"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleRewardActiveAction, deleteRewardAction } from "@/app/admin/puan-magazasi/actions";
import type { PointRewardItem } from "@/db/queries/point-store";

export function RewardAdminRow({ reward }: { reward: PointRewardItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleRewardActiveAction(reward.id);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Bu ödülü silmek istediğinizden emin misiniz? Alan kullanıcılar çerçeveyi kaybetmez ama bu ödül artık listede görünmez.")) return;
    startTransition(async () => {
      await deleteRewardAction(reward.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-4 rounded-lg border border-border p-4">
      <span
        className="size-8 shrink-0 rounded-full border-2"
        style={{ borderColor: reward.rewardValue }}
      />
      <div className="flex-1">
        <p className="font-medium">{reward.name}</p>
        <p className="text-xs text-muted-foreground">
          {reward.pointCost} puan · {reward.rewardValue}
          {reward.description && ` · ${reward.description}`}
        </p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${reward.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
        {reward.active ? "Aktif" : "Pasif"}
      </span>
      <Button variant="outline" size="sm" disabled={isPending} onClick={toggle}>
        {reward.active ? "Pasife Al" : "Aktif Et"}
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
