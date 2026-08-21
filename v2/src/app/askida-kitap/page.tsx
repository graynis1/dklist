import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { getStoreList, storeImageUrl } from "@/db/queries/store";

const STATUS_LABELS: Record<string, string> = {
  active: "Mevcut",
  completed: "Verildi",
  cancelled: "İptal",
};

export default function StoreListPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Topluluk</SectionLabel>
            <h1 className="font-heading text-3xl font-medium tracking-tight">Askıda Kitap</h1>
          </div>
          <Button render={<Link href="/askida-kitap/yeni" />}>İlan Ver</Button>
        </div>
        <Suspense fallback={<StoreListSkeleton />}>
          <StoreList />
        </Suspense>
      </div>
    </div>
  );
}

function StoreListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function StoreList() {
  const listings = await getStoreList();

  if (listings.length === 0) {
    return <p className="text-muted-foreground">Henüz bir ilan yok - ilk ilanı sen ver.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((item) => (
        <Link
          key={item.id}
          href={`/askida-kitap/${item.slug}`}
          className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
        >
          <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
            {storeImageUrl(item.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storeImageUrl(item.image)!}
                alt={item.title}
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col gap-0.5 px-1 pb-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.listingType === "paid" && item.price ? `${item.price} TL` : "Ücretsiz"} ·{" "}
              {STATUS_LABELS[item.status] ?? item.status}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{item.ownerUsername}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
