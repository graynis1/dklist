"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateMarketplaceSettingsAction } from "@/app/admin/pazaryeri-ayarlari/actions";
import type { MarketplaceSettingsView } from "@/db/queries/marketplace-settings";

export function MarketplaceSettingsForm({ settings }: { settings: MarketplaceSettingsView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateMarketplaceSettingsAction(formData);
      if (result.status) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.message ?? "Güncellenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">iyzico durumu</p>
          <p className="text-sm text-muted-foreground">
            {settings.configured ? "API anahtarları girilmiş." : "API anahtarları henüz girilmedi - ücretli satın alma çalışmaz."}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${settings.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
          {settings.active ? "Aktif" : "Pasif"}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={settings.active} disabled={isPending} />
        Ücretli ilan satın alma özelliğini aktif et
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Komisyon Oranı (%)
        <Input type="number" name="commissionRate" step="0.1" min="0" max="100" defaultValue={settings.commissionRate} disabled={isPending} className="max-w-40" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        iyzico API Key
        <Input name="iyzicoApiKey" placeholder={settings.iyzicoApiKey ? "•••••••• (girilmiş - değiştirmek için yaz)" : "API anahtarını gir"} disabled={isPending} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        iyzico Secret Key
        <Input name="iyzicoSecretKey" type="password" placeholder={settings.iyzicoSecretKey ? "•••••••• (girilmiş - değiştirmek için yaz)" : "Secret key'i gir"} disabled={isPending} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        iyzico Base URL
        <Input name="iyzicoBaseUrl" defaultValue={settings.iyzicoBaseUrl} disabled={isPending} />
        <span className="text-xs text-muted-foreground">
          Sandbox: https://sandbox-api.iyzipay.com · Canlı: https://api.iyzipay.com
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">Ayarlar kaydedildi.</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
