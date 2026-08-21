"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSellerPayoutProfileAction } from "@/app/hesap/satici-odeme-bilgileri/actions";
import type { SellerPayoutView } from "@/db/queries/seller-payout";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  not_onboarded: { label: "Kayıt yapılmamış", className: "bg-muted text-muted-foreground" },
  pending: { label: "Beklemede", className: "bg-amber-100 text-amber-800" },
  active: { label: "Aktif - satış yapabilirsiniz", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Reddedildi - bilgileri kontrol edip tekrar deneyin", className: "bg-destructive/10 text-destructive" },
};

export function SellerPayoutForm({ profile }: { profile: SellerPayoutView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const status = STATUS_LABELS[profile.status] ?? STATUS_LABELS.not_onboarded;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateSellerPayoutProfileAction(formData);
      if (!result.status) setError(result.message ?? "Kaydedilemedi.");
      else router.refresh();
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4 rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <p className="font-medium">Ödeme Bilgileri</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Ücretli Askıda Kitap ilanı satabilmek için IBAN ve kimlik bilgilerinizi girmeniz gerekir -
        satıştan payınız doğrudan bu hesaba yatırılır.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Ad Soyad
        <Input name="contactName" defaultValue={profile.contactName ?? ""} required disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        TC Kimlik No
        <Input name="identityNumber" defaultValue={profile.identityNumber ?? ""} maxLength={11} required disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        IBAN
        <Input name="iban" defaultValue={profile.iban ?? ""} placeholder="TR..." required disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Telefon
        <Input name="phone" defaultValue={profile.phone ?? ""} required disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Adres
        <Input name="address" defaultValue={profile.address ?? ""} required disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Şehir
        <Input name="city" defaultValue={profile.city ?? ""} required disabled={isPending} />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
