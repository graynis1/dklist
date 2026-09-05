"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRewardAction } from "@/app/admin/puan-magazasi/actions";

export function CreateRewardForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createRewardAction(formData);
      if (result.status) {
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result.message ?? "Eklenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Ödül Ekle</h2>
      <Input name="name" placeholder="Ad (örn: Altın Çerçeve)" required />
      <Input name="description" placeholder="Açıklama (opsiyonel)" />
      <Input type="number" name="pointCost" placeholder="Puan Bedeli" required min="1" />
      <input type="hidden" name="rewardType" value="profile_frame" />
      <Input name="rewardValue" placeholder="Çerçeve rengi (CSS renk değeri, örn: gold veya #ffd700)" required />
      {/* Real customer report: "verin girişinde en sonrdaki 0 lup rakam
          girilen yer ne işe yarıyor?" - a bare placeholder disappears the
          moment you focus the field, so it read as unlabeled. Real label
          + explanation now, same field either way. */}
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Sıra (mağazada görünme sırası - küçük sayı önce görünür)
        <Input type="number" name="sortOrder" defaultValue={0} />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
