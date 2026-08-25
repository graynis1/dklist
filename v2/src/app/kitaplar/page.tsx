import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Tüm Kitaplar",
  description: "Binlerce kitabı ara, filtrele, okuma durumunu takip et, puanla.",
  path: "/kitaplar",
});
import Link from "next/link";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { getBookList, getTopCategories, type BookSortBy } from "@/db/queries/books";

const SORT_OPTIONS: { value: BookSortBy; label: string }[] = [
  { value: "viewCount", label: "Popülerlik" },
  { value: "score", label: "Puan" },
  { value: "name", label: "İsim" },
];

export default function BookListPage({ searchParams }: PageProps<"/kitaplar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Katalog</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Tüm Kitaplar</h1>
        </div>
        <Suspense fallback={<BookListSkeleton />}>
          <BookListContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function BookListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

async function BookListContent({
  searchParams,
}: {
  searchParams: PageProps<"/kitaplar">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";
  const sortBy: BookSortBy =
    params.sortBy === "score" || params.sortBy === "name" ? params.sortBy : "viewCount";
  const onlyRead = params.onlyRead === "1";

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const [{ items, total, lastPage }, topCategories] = await Promise.all([
    getBookList(page, 40, search, sortBy, "desc", onlyRead && userId ? userId : undefined),
    page === 1 && !search && !onlyRead ? getTopCategories(14) : Promise.resolve([]),
  ]);

  const baseQuery: Record<string, string> = {};
  if (search) baseQuery.search = search;
  if (sortBy !== "viewCount") baseQuery.sortBy = sortBy;
  if (onlyRead) baseQuery.onlyRead = "1";
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...baseQuery, ...extra }).toString();

  return (
    <div>
      {topCategories.length > 0 && (
        <div className="mb-6 -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {topCategories.map((c) => (
            <Link
              key={c.id}
              href={`/kategori/${c.slug}`}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <form action="/kitaplar" className="mb-8 flex flex-wrap items-center gap-2">
        <Input name="search" defaultValue={search} placeholder="Kitap adında ara..." className="max-w-xs" />
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
        {userId && (
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type="checkbox" name="onlyRead" value="1" defaultChecked={onlyRead} />
            Sadece okuduklarım
          </label>
        )}
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search || onlyRead ? "Bu filtreye uyan kitap yok." : "Henüz kitap eklenmedi."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((b) => (
              <Link key={b.id} href={`/kitap/${b.slug}`} className="flex flex-col gap-2">
                <BookCover
                  title={b.name}
                  author={b.writers.join(", ") || "Yazar bilinmiyor"}
                  tone={toneForId(b.id)}
                  bookId={b.id}
                  hasImage={b.hasImage}
                  size="sm"
                  className="w-full"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="truncate text-xs font-medium">{b.name}</p>
                  <p className="truncate text-[0.7rem] text-muted-foreground">
                    {b.writers.join(", ") || "Yazar bilinmiyor"}
                  </p>
                  <div className="flex items-center gap-1 text-[0.7rem]">
                    <StarRating value={b.score} />
                    <span className="text-muted-foreground">{b.score.toFixed(1)}/10</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
              {pageWindow(page, lastPage).map((p) => (
                <Link
                  key={p}
                  href={`/kitaplar?${qs({ page: String(p) })}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      {total > 0 && <p className="mt-4 text-xs text-muted-foreground">Toplam {total} kitap.</p>}
    </div>
  );
}

function pageWindow(page: number, lastPage: number, size = 20): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), lastPage - size + 1));
  const end = Math.min(lastPage, start + size - 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
