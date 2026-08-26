import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { auth } from "@/auth";
import { getMyFavoriteStores, storeImageUrl } from "@/db/queries/store";

export default function MyFavoritesPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Favorilerim</h1>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <FavoritesList />
        </Suspense>
      </div>
    </div>
  );
}

async function FavoritesList() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const favorites = await getMyFavoriteStores(Number(session.user.id));

  if (favorites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz favorilediğin bir ilan yok.{" "}
        <Link href="/askida-kitap" className="underline hover:text-foreground">
          Askıda Kitap&apos;a göz at
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {favorites.map((item) => (
        <Link
          key={item.id}
          href={`/askida-kitap/${item.slug}`}
          className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-accent"
        >
          <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
            {storeImageUrl(item.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={storeImageUrl(item.image)!} alt={item.title} className="size-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 px-1 pb-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.listingType === "paid" && item.price ? `${item.price} TL` : "Ücretsiz"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
