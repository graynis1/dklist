import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { auth } from "@/auth";
import { getMyStores, storeImageUrl, type MyStoreItem } from "@/db/queries/store";

const STATUS_GROUPS: { status: string; label: string }[] = [
  { status: "active", label: "Yayında" },
  { status: "completed", label: "Verildi" },
  { status: "cancelled", label: "İptal Edildi" },
];

export default function MyStoresPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">İlanlarım</h1>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <MyStoresList />
        </Suspense>
      </div>
    </div>
  );
}

async function MyStoresList() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const stores = await getMyStores(Number(session.user.id));

  if (stores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz bir ilanın yok.{" "}
        <Link href="/askida-kitap/yeni" className="underline hover:text-foreground">
          İlan ver
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Real gap found via customer report: this was a flat list with no
          way to tell active/given/cancelled listings apart at a glance,
          matching v1's own grouped view. */}
      {STATUS_GROUPS.map(({ status, label }) => {
        const items = stores.filter((s) => s.status === status);
        if (items.length === 0) return null;
        return (
          <div key={status} className="flex flex-col gap-3">
            <h2 className="font-heading text-lg font-medium">
              {label} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
            </h2>
            <StoreGrid items={items} />
          </div>
        );
      })}
    </div>
  );
}

function StoreGrid({ items }: { items: MyStoreItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/askida-kitap/${item.slug}`}
          className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
        >
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-muted">
            {storeImageUrl(item.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeImageUrl(item.image)!} alt={item.title} className="size-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">Fotoğraf yok</span>
            )}
          </div>
          <p className="truncate px-1 pb-1 text-sm font-medium">{item.title}</p>
        </Link>
      ))}
    </div>
  );
}
