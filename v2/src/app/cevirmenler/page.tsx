import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Çevirmenler",
  description: "DKList'teki çevirmenleri keşfet, puanla, yorum yap.",
  path: "/cevirmenler",
});
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { getTranslatorList } from "@/db/queries/translators";
import { translatorImageUrl } from "@/lib/image-urls";
import { AdSlot } from "@/components/dklist/ad-slot";

export default function TranslatorListPage({ searchParams }: PageProps<"/cevirmenler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Çevirmenler</h1>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <TranslatorList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function TranslatorList({
  searchParams,
}: {
  searchParams: PageProps<"/cevirmenler">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, lastPage } = await getTranslatorList(page, 40, search);

  return (
    <div>
      <form action="/cevirmenler" className="mb-8 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Çevirmen adında ara..." className="max-w-xs" />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      <Suspense fallback={null}>
        <AdSlot placement="cevirmenler-listesi" className="mb-8 max-w-none px-0" />
      </Suspense>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{search ? "Bu aramaya uyan çevirmen yok." : "Henüz çevirmen yok."}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((t) => (
              <Link
                key={t.id}
                href={`/cevirmen/${t.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <EntityAvatar id={t.id} name={t.name} imageUrl={translatorImageUrl(t.image)} />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <StarRating value={t.score} />
                    <span className="text-muted-foreground">{t.score.toFixed(1)}/10</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <PaginationNav
            page={page}
            lastPage={lastPage}
            hrefForPage={(p) => `/cevirmenler?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
          />
        </>
      )}
    </div>
  );
}
