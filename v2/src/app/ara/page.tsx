import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { searchBooks } from "@/db/queries/search";

export default function SearchPage({ searchParams }: PageProps<"/ara">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Ara</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            Kitap Ara
          </h1>
        </div>

        <form action="/ara" className="mb-10">
          <Input
            name="q"
            placeholder="Kitap adı yazmaya başla…"
            className="h-12 text-base"
            autoFocus
          />
        </form>

        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-24 w-16 shrink-0 animate-pulse rounded-[0.25rem] bg-muted" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/ara">["searchParams"];
}) {
  const { q } = await searchParams;
  const term = typeof q === "string" ? q : "";

  if (term.trim().length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Aramaya başlamak için en az 2 karakter yaz. Sonuçlar kitap adının
        başından eşleşir (ör. &ldquo;suç&rdquo; → &ldquo;Suç ve Ceza&rdquo;).
      </p>
    );
  }

  const results = await searchBooks(term);

  if (results.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        &ldquo;{term}&rdquo; için sonuç bulunamadı.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {results.length} sonuç
      </p>
      {results.map((book) => (
        <Link
          key={book.id}
          href={`/kitap/${book.slug}`}
          className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <BookCover
            title={book.name}
            author={book.writers.join(", ")}
            tone={toneForId(book.id)}
            size="sm"
            className="w-16 shrink-0"
          />
          <div className="flex flex-col gap-1">
            <p className="font-medium">{book.name}</p>
            <p className="text-sm text-muted-foreground">
              {book.writers.join(", ") || "Yazar bilinmiyor"}
            </p>
            <div className="flex items-center gap-1 text-xs">
              <StarRating value={book.score} />
              <span className="text-muted-foreground">
                {book.score.toFixed(1)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
