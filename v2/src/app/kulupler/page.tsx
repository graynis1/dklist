import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getClubList } from "@/db/queries/book-clubs";

export default function BookClubListPage({ searchParams }: PageProps<"/kulupler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Topluluk</SectionLabel>
            <h1 className="font-heading text-3xl font-medium tracking-tight">Kitap Kulüpleri</h1>
          </div>
          <Button render={<Link href="/kulup/yeni" />} nativeButton={false}>
            Kulüp Kur
          </Button>
        </div>
        <Suspense fallback={<ClubListSkeleton />}>
          <ClubList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ClubListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function ClubList({
  searchParams,
}: {
  searchParams: PageProps<"/kulupler">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getClubList(page, 20, search);

  return (
    <div>
      <form action="/kulupler" className="mb-8 flex flex-wrap items-center gap-2">
        <Input name="search" defaultValue={search} placeholder="Kulüp adında ara..." className="max-w-xs" />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {search ? "Bu aramaya uyan kulüp yok." : "Henüz kulüp yok - ilkini sen kur."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((club) => (
              <Link
                key={club.id}
                href={`/kulup/${club.slug}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{club.name}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {club.memberCount} üye
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
                {club.currentBookName && (
                  <p className="text-xs text-muted-foreground">
                    📖 Şu an okunuyor: <span className="font-medium">{club.currentBookName}</span>
                  </p>
                )}
              </Link>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex justify-center gap-2 text-sm">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/kulupler?${new URLSearchParams({ ...(search ? { search } : {}), page: String(p) }).toString()}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      {total > 0 && <p className="mt-2 text-xs text-muted-foreground">Toplam {total} kulüp.</p>}
    </div>
  );
}
