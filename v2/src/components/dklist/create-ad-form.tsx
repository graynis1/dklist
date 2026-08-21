"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAdAction } from "@/app/admin/reklamlar/actions";

export function CreateAdForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAdAction(formData);
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
      <h2 className="font-heading text-lg font-medium">Yeni Reklam Ekle</h2>
      <Input name="placement" placeholder="Yerleşim (örn: homepage-banner)" required />
      <Input name="linkUrl" placeholder="Bağlantı URL'si (opsiyonel)" />
      <Input type="number" name="sortOrder" placeholder="Sıra (küçük önce gösterilir)" defaultValue={0} />
      <input type="file" name="image" accept="image/png,image/jpeg,image/webp" required className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
