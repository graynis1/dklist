import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Askıda Kitap",
  description: "İkinci el kitap ilanlarını incele, kendi kitabını DKList'te askıya çıkar.",
  path: "/askida-kitap",
});
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getStoreList,
  storeImageUrl,
  type StoreListingTypeFilter,
  type StoreSortBy,
} from "@/db/queries/store";

const STATUS_LABELS: Record<string, string> = {
  active: "Mevcut",
  completed: "Verildi",
  cancelled: "İptal",
};

const SORT_OPTIONS: { value: StoreSortBy; label: string }[] = [
  { value: "id", label: "En Yeni" },
  { value: "price", label: "Fiyat" },
  { value: "viewCount", label: "Görüntülenme" },
];

export default function StoreListPage({ searchParams }: PageProps<"/askida-kitap">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Topluluk</SectionLabel>
            <h1 className="font-heading text-3xl font-medium tracking-tight">Askıda Kitap</h1>
          </div>
          <Button render={<Link href="/askida-kitap/yeni" />} nativeButton={false}>İlan Ver</Button>
        </div>
        <Suspense fallback={<StoreListSkeleton />}>
          <StoreList searchParams={searchParams} />
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

async function StoreList({
  searchParams,
}: {
  searchParams: PageProps<"/askida-kitap">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";
  const listingType: StoreListingTypeFilter =
    params.listingType === "free" || params.listingType === "paid" ? params.listingType : null;
  const sortBy: StoreSortBy =
    params.sortBy === "price" || params.sortBy === "viewCount" ? params.sortBy : "id";

  const { items, total, lastPage } = await getStoreList({ page, pageSize: 40, search, listingType, sortBy });

  const baseQuery: Record<string, string> = {};
  if (search) baseQuery.search = search;
  if (listingType) baseQuery.listingType = listingType;
  if (sortBy !== "id") baseQuery.sortBy = sortBy;
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...baseQuery, ...extra }).toString();

  return (
    <div>
      <form action="/askida-kitap" className="mb-8 flex flex-wrap items-center gap-2">
        <Input name="search" defaultValue={search} placeholder="İlan başlığında ara..." className="max-w-xs" />
        <Select
          name="listingType"
          defaultValue={listingType ?? ""}
          items={[
            { value: "", label: "Tümü" },
            { value: "free", label: "Ücretsiz" },
            { value: "paid", label: "Ücretli" },
          ]}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tümü</SelectItem>
            <SelectItem value="free">Ücretsiz</SelectItem>
            <SelectItem value="paid">Ücretli</SelectItem>
          </SelectContent>
        </Select>
        <Select name="sortBy" defaultValue={sortBy} items={SORT_OPTIONS}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {search || listingType ? "Bu filtreye uyan ilan yok." : "Henüz bir ilan yok - ilk ilanı sen ver."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/askida-kitap/${item.slug}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                  {item.ownerIsPremium && (
                    <span className="absolute left-1 top-1 z-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      ★ Öne Çıkan
                    </span>
                  )}
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

          {lastPage > 1 && (
            <div className="mt-8 flex justify-center gap-2 text-sm">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/askida-kitap?${qs({ page: String(p) })}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      {total > 0 && <p className="mt-2 text-xs text-muted-foreground">Toplam {total} ilan.</p>}
    </div>
  );
}
