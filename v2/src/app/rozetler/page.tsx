import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Rozetler",
  description: "DKList'te aktifliğinle kazanabileceğin rozetleri keşfet.",
  path: "/rozetler",
});
import { connection } from "next/server";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getPublicBadgeGallery } from "@/db/queries/badges-public";
import { AdSlot } from "@/components/dklist/ad-slot";

export default function BadgeGalleryPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Rozet Galerisi</h1>
          <p className="text-sm text-muted-foreground">
            DKList&apos;te kazanılabilecek tüm rozetler.
          </p>
        </div>
        <Suspense fallback={null}>
          <AdSlot placement="rozetler" className="mb-8 max-w-none px-0" />
        </Suspense>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <BadgeGalleryContent />
        </Suspense>
      </div>
    </div>
  );
}

async function BadgeGalleryContent() {
  await connection();
  const gallery = await getPublicBadgeGallery();

  if (gallery.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz tanımlı bir rozet yok.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {gallery.map((b) => (
        <div key={b.id} className="flex items-center gap-4 rounded-lg border border-border p-4">
          {b.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/badge-image/${b.img}`} alt="" className="size-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">🏅</span>
          )}
          <div className="flex-1">
            <p className="font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">{b.comment}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.earnedByCount} kişi kazandı
              {b.milestoneThreshold && ` · ${b.milestoneThreshold} puana ulaşınca otomatik kazanılır`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
