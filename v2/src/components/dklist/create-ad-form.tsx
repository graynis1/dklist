"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAdAction } from "@/app/admin/reklamlar/actions";
import { AD_PLACEMENTS } from "@/lib/ad-placements";

export function CreateAdForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placement, setPlacement] = useState<string>(AD_PLACEMENTS[0].id);
  const formRef = useRef<HTMLFormElement>(null);
  const recommendedSize = AD_PLACEMENTS.find((p) => p.id === placement)?.recommendedSize;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAdAction(formData);
      if (result.status) {
        formRef.current?.reset();
        setPlacement(AD_PLACEMENTS[0].id);
        router.refresh();
      } else {
        setError(result.message ?? "Eklenemedi.");
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="mb-6 flex flex-col gap-3 rounded-lg border border-border p-4">
      <h2 className="font-heading text-lg font-medium">Yeni Reklam Ekle</h2>
      <input type="hidden" name="placement" value={placement} />
      <Select value={placement} onValueChange={(v) => v && setPlacement(v)} items={AD_PLACEMENTS.map((p) => ({ value: p.id, label: p.label }))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AD_PLACEMENTS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Same "what size do I even prepare" gap this closes on /reklam-ver -
          shown here too since this is the other place someone picks a
          placement and immediately needs to know what to upload. */}
      {recommendedSize && <p className="text-xs text-muted-foreground">Önerilen görsel boyutu: {recommendedSize}</p>}
      <Input name="language" placeholder="Dil hedefleme (opsiyonel, örn: tr, en - boş = tüm diller)" />
      <Input name="linkUrl" placeholder="Bağlantı URL'si (opsiyonel)" />
      <Input type="number" name="sortOrder" placeholder="Sıra (küçük önce gösterilir)" defaultValue={0} />
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Masaüstü görseli
        <input type="file" name="image" accept="image/*" required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        Mobil görseli (opsiyonel - eklenmezse masaüstü görseli küçültülerek kullanılır, metin
        küçük görünebilir)
        <input type="file" name="mobileImage" accept="image/*" className="text-sm" />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        Ekle
      </Button>
    </form>
  );
}
