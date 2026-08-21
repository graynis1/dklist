import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { searchBooks, searchWriters, searchTranslators, searchPublishers, searchUsers } from "@/db/queries/search";

export default function SearchPage({ searchParams }: PageProps<"/ara">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Ara</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            Ara
          </h1>
        </div>

        <form action="/ara" className="mb-10">
          <Input
            name="q"
            placeholder="Kitap, yazar, çevirmen, yayınevi veya kullanıcı ara…"
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

  const [books, writers, translators, publishers, users] = await Promise.all([
    searchBooks(term),
    searchWriters(term),
    searchTranslators(term),
    searchPublishers(term),
    searchUsers(term),
  ]);

  const totalCount = books.length + writers.length + translators.length + publishers.length + users.length;

  if (totalCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        &ldquo;{term}&rdquo; için sonuç bulunamadı.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {books.length > 0 && (
        <div className="flex flex-col gap-4">
          <SectionLabel>Kitaplar</SectionLabel>
          {books.map((book) => (
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
                    {book.score.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {writers.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Yazarlar</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {writers.map((w) => (
              <Link
                key={w.id}
                href={`/yazar/${w.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
              >
                {w.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {translators.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Çevirmenler</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {translators.map((t) => (
              <Link
                key={t.id}
                href={`/cevirmen/${t.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {publishers.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Yayınevleri</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {publishers.map((p) => (
              <Link
                key={p.id}
                href={`/yayinevi/${p.slug}`}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {users.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Kullanıcılar</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <Link
                key={u.id}
                href={`/profil/${u.username}`}
                className="rounded-full border border-border px-3 py-1 text-sm hover:bg-accent"
              >
                @{u.username}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
