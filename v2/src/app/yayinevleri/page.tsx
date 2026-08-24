import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPublisherList } from "@/db/queries/publishers";
import { toneForId, TONE_STYLE } from "@/components/dklist/book-cover";

export default function PublisherListPage({ searchParams }: PageProps<"/yayinevleri">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Yayınevleri</h1>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <PublisherList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function PublisherList({
  searchParams,
}: {
  searchParams: PageProps<"/yayinevleri">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, lastPage } = await getPublisherList(page, 40, search);

  return (
    <div>
      <form action="/yayinevleri" className="mb-8 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Yayınevi adında ara..." className="max-w-xs" />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{search ? "Bu aramaya uyan yayınevi yok." : "Henüz yayınevi yok."}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((p) => {
              const tone = toneForId(p.id);
              const t = TONE_STYLE[tone];
              return (
                <Link
                  key={p.id}
                  href={`/yayinevi/${p.slug}`}
                  className="flex items-center gap-3 truncate rounded-lg border border-border p-3 text-sm font-medium transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                    style={{ backgroundColor: t.bg, color: t.fg }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
              {pageWindow(page, lastPage).map((p) => (
                <Link
                  key={p}
                  href={`/yayinevleri?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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

function pageWindow(page: number, lastPage: number, size = 20): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), lastPage - size + 1));
  const end = Math.min(lastPage, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
