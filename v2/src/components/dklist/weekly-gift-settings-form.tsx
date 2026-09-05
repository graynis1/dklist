"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateWeeklyGiftSettingsAction } from "@/actions/points";
import type { WeeklyGiftSettingsView } from "@/db/queries/points";

/** Real customer report: "hediye kitap etmediğim an yanlış vaat yaramamak
 * için bunu nasıl ayarlarız" - this toggle is what /puan-tablosu's "her
 * hafta bir kitap hediye edilir" claim now checks, instead of always
 * showing it regardless of whether a real book is actually lined up. */
export function WeeklyGiftSettingsForm({ settings }: { settings: WeeklyGiftSettingsView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function submit(formData: FormData) {
    setSuccess(false);
    startTransition(async () => {
      await updateWeeklyGiftSettingsAction(formData);
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="mb-8 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-sm font-medium text-muted-foreground">Haftalık Hediye Duyurusu</h2>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={settings.active} disabled={isPending} />
        Sitede &quot;her hafta bir kitap hediye edilir&quot; duyurusunu göster
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Not (opsiyonel - duyuru kapalıyken kullanıcıya gösterilecek açıklama)
        <Input name="note" defaultValue={settings.note ?? ""} disabled={isPending} placeholder="Örn: Bu hafta hediye kitap yok, yakında devam edecek." />
      </label>
      {success && <p className="text-sm text-emerald-700">Kaydedildi.</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
