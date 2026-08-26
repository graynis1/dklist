import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Yazarlar",
  description: "DKList'teki yazarları keşfet, puanla, yorum yap.",
  path: "/yazarlar",
});
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { AdSlot } from "@/components/dklist/ad-slot";
import { getWriterList } from "@/db/queries/writers";

export default function WriterListPage({ searchParams }: PageProps<"/yazarlar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Yazarlar</h1>
        </div>
        <Suspense fallback={<WriterListSkeleton />}>
          <WriterList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function WriterListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function WriterList({
  searchParams,
}: {
  searchParams: PageProps<"/yazarlar">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, lastPage } = await getWriterList(page, 40, search);

  return (
    <div>
      <form action="/yazarlar" className="mb-8 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Yazar adında ara..." className="max-w-xs" />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      <Suspense fallback={null}>
        <AdSlot placement="yazarlar-listesi" className="mb-8 max-w-none px-0" />
      </Suspense>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{search ? "Bu aramaya uyan yazar yok." : "Henüz yazar yok."}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((w) => (
              <Link
                key={w.id}
                href={`/yazar/${w.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
              >
                <EntityAvatar id={w.id} name={w.name} />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-sm font-medium">{w.name}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <StarRating value={w.score} />
                    <span className="text-muted-foreground">{w.score.toFixed(1)}/10</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
              {/* With ~11.3M writers on the real prod table, lastPage can run
                  into the hundreds of thousands - a small window around the
                  current page, not every page number, matching PLAN.md's own
                  "cap deep pagination" note for large listings. */}
              {(() => {
                const windowSize = 20;
                const start = Math.max(1, Math.min(page - Math.floor(windowSize / 2), lastPage - windowSize + 1));
                const end = Math.min(lastPage, start + windowSize - 1);
                return Array.from({ length: end - start + 1 }, (_, i) => start + i);
              })().map((p) => (
                <Link
                  key={p}
                  href={`/yazarlar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
