"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleRewardActiveAction, deleteRewardAction, updateRewardAction } from "@/app/admin/puan-magazasi/actions";
import type { PointRewardItem } from "@/db/queries/point-store";
import { ProfileFrameRing } from "@/components/dklist/profile-frame-ring";

export function RewardAdminRow({ reward }: { reward: PointRewardItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateRewardAction(reward.id, formData);
      if (result.status) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-border p-4">
        <form action={save} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Input name="name" defaultValue={reward.name} placeholder="Ad" required />
            <Input name="pointCost" type="number" defaultValue={reward.pointCost} placeholder="Puan Bedeli" required min="1" />
          </div>
          <Input name="description" defaultValue={reward.description ?? ""} placeholder="Açıklama (opsiyonel)" />
          <div className="grid grid-cols-2 gap-2">
            <Input name="rewardValue" defaultValue={reward.rewardValue} placeholder="Çerçeve rengi" required />
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Sıra (küçük sayı önce görünür)
              <Input name="sortOrder" type="number" defaultValue={reward.sortOrder} />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Kaydet
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Vazgeç
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 rounded-lg border border-border p-4">
      <ProfileFrameRing color={reward.rewardValue} size={32} ringWidth={3} pointCost={reward.pointCost}>
        <span className="block size-8 rounded-full bg-muted" />
      </ProfileFrameRing>
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
      {/* Real customer report: "burda çerçevelerde de düzenle yok". */}
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Düzenle
      </Button>
      <Button variant="outline" size="sm" disabled={isPending} onClick={toggle}>
        {reward.active ? "Pasife Al" : "Aktif Et"}
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
