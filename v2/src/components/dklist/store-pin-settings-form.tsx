"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateStorePinSettingsAction } from "@/app/admin/one-cikan-ilan-ayarlari/actions";
import type { StorePinSettingsView } from "@/db/queries/store-pin";

export function StorePinSettingsForm({ settings }: { settings: StorePinSettingsView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateStorePinSettingsAction(formData);
      if (result.status) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={settings.active} disabled={isPending} />
        İlan öne çıkarma satışını aktif et
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fiyat (TL)
        <Input type="number" name="priceLira" step="0.01" min="1" defaultValue={(settings.priceKurus / 100).toFixed(2)} disabled={isPending} className="max-w-40" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Süre (gün)
        <Input type="number" name="durationDays" min="1" defaultValue={settings.durationDays} disabled={isPending} className="max-w-40" />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">Kaydedildi.</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
