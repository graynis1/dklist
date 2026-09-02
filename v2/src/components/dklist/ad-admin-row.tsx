"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleAdActiveAction, deleteAdAction, setAdMobileImageAction } from "@/app/admin/reklamlar/actions";
import { advertisementImageUrl } from "@/lib/image-urls";
import type { AdAdminListItem } from "@/db/queries/advertisements";

export function AdAdminRow({ ad }: { ad: AdAdminListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    startTransition(async () => {
      await toggleAdActiveAction(ad.id);
      router.refresh();
    });
  }

  function remove() {
    if (!window.confirm("Bu reklamı silmek istediğinizden emin misiniz?")) return;
    startTransition(async () => {
      await deleteAdAction(ad.id);
      router.refresh();
    });
  }

  function uploadMobileImage(file: File) {
    const formData = new FormData();
    formData.set("mobileImage", file);
    startTransition(async () => {
      await setAdMobileImageAction(ad.id, formData);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={advertisementImageUrl(ad.image)} alt="" className="h-16 w-28 rounded-md border border-border object-cover" />
        {/* Real bug found via customer report: a flat wide image scales
            down with its container, shrinking baked-in text to near-
            illegible size on a narrow phone - see migration 0036. */}
        {ad.mobileImage ? (
          <span className="text-[10px] text-muted-foreground">Mobil görsel var</span>
        ) : (
          <button
            type="button"
            onClick={() => mobileInputRef.current?.click()}
            disabled={isPending}
            className="text-[10px] text-primary underline"
          >
            Mobil görsel ekle
          </button>
        )}
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMobileImage(file);
          }}
        />
      </div>
      <div className="flex-1">
        <p className="font-medium">{ad.placement} {ad.language && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-normal uppercase text-secondary-foreground">{ad.language}</span>}</p>
        <p className="text-xs text-muted-foreground">{ad.linkUrl || "Bağlantı yok"} · sıra: {ad.sortOrder}</p>
        <p className="text-xs text-muted-foreground">
          {ad.impressions.toLocaleString("tr-TR")} gösterim · {ad.clicks.toLocaleString("tr-TR")} tıklama
          {ad.impressions > 0 && ` · %${((ad.clicks / ad.impressions) * 100).toFixed(2)} CTR`}
        </p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-medium ${ad.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
        {ad.active ? "Aktif" : "Pasif"}
      </span>
      <Button variant="outline" size="sm" disabled={isPending} onClick={toggle}>
        {ad.active ? "Pasife Al" : "Aktif Et"}
      </Button>
      <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending} onClick={remove}>
        Sil
      </Button>
    </li>
  );
}
