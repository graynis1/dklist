"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateSitePopupAction } from "@/app/admin/site-popup/actions";
import type { SitePopupView } from "@/db/queries/site-popup";

export function SitePopupSettingsForm({ popup }: { popup: SitePopupView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateSitePopupAction(formData);
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
        <input type="checkbox" name="active" defaultChecked={popup.active} disabled={isPending} />
        Açılış popup'ını aktif et
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Başlık
        <Input name="title" defaultValue={popup.title ?? ""} disabled={isPending} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        İçerik
        <textarea
          name="content"
          defaultValue={popup.content ?? ""}
          disabled={isPending}
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Bağlantı URL'si (opsiyonel)
        <Input name="link" defaultValue={popup.link ?? ""} disabled={isPending} />
      </label>
      {popup.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/site-popup-image/${popup.image}`} alt="" className="h-32 w-full rounded-md border border-border object-cover" />
      )}
      <label className="flex flex-col gap-1 text-sm">
        Görsel (opsiyonel, yüklersen mevcut görseli değiştirir)
        <input type="file" name="image" accept="image/png,image/jpeg,image/webp" className="text-sm" disabled={isPending} />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">Kaydedildi.</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Kaydet
      </Button>
    </form>
  );
}
