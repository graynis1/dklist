import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { HeroShelf } from "@/components/dklist/hero-shelf";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { demoBooks } from "@/components/dklist/demo-books";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { getLatestBooks, getTopCategories } from "@/db/queries/books";

const STATS = [
  { value: "98M+", label: "Katalogdaki Kitap" },
  { value: "11M+", label: "Yazar" },
  { value: "4,6M+", label: "Yayınevi" },
  { value: "537K+", label: "Kategori" },
];

function CategoriesSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  );
}

async function CategoriesShelf() {
  const categories = await getTopCategories(24);

  if (categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Henüz kategori yok.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/kategori/${cat.slug}`}
          className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-accent"
        >
          {cat.name}
          <span className="ml-1.5 text-muted-foreground">
            {cat.bookCount.toLocaleString("tr-TR")}
          </span>
        </Link>
      ))}
    </div>
  );
}

function LatestBooksSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-32 shrink-0">
          <div className="aspect-[2/3] animate-pulse rounded-[0.35rem] bg-muted" />
        </div>
      ))}
    </div>
  );
}

async function LatestBooksShelf() {
  const books = await getLatestBooks(12);

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz kitap eklenmedi.
      </p>
    );
  }

  return (
    <div className="-mx-6 flex gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {books.map((book) => (
        <Link
          key={book.id}
          href={`/kitap/${book.slug}`}
          className="flex w-32 shrink-0 flex-col gap-2"
        >
          <BookCover
            title={book.name}
            author={book.writers.join(", ") || "Yazar bilinmiyor"}
            tone={toneForId(book.id)}
            size="sm"
            className="w-full"
          />
          <p className="truncate text-xs font-medium">{book.name}</p>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const [featured, ...rest] = demoBooks;
  const picks = rest.slice(0, 4);

  return (
    <div className="flex-1 bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_15%_20%,oklch(0.58_0.16_42/0.18),transparent_45%),radial-gradient(circle_at_85%_0%,oklch(0.58_0.16_42/0.12),transparent_40%)]"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="flex flex-col gap-6">
            <SectionLabel>Türkiye&apos;nin Kitap Topluluğu</SectionLabel>
            <h1 className="font-heading max-w-xl text-5xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
              Okuduğun her kitap, <em className="text-primary not-italic">bir hikayenin</em> parçası olsun.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
              Değerlendir, keşfet, takasa çıkar. DKList; okurları, yazarları
              ve yayınevlerini tek bir rafta buluşturuyor.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" className="text-base">
                Keşfetmeye Başla
              </Button>
              <Button size="lg" variant="outline" className="text-base">
                Nasıl Çalışır?
              </Button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-border pt-6 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <dt className="font-heading text-2xl font-medium">
                    {stat.value}
                  </dt>
                  <dd className="text-xs text-muted-foreground">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroShelf />
        </div>
      </section>

      <Separator />

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Bu Ay Öne Çıkan</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Editörün seçtiği kitap
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          <BookCover
            title={featured.title}
            author={featured.author}
            tone={featured.tone}
            size="lg"
            className="mx-auto w-full max-w-[280px] lg:mx-0"
          />
          <div className="flex flex-col justify-center gap-4">
            <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
              {featured.genre}
            </span>
            <h3 className="font-heading text-4xl font-medium tracking-tight">
              {featured.title}
            </h3>
            <p className="text-lg text-muted-foreground">{featured.author}</p>
            <div className="flex items-center gap-2 text-sm">
              <StarRating value={featured.rating} />
              <span className="font-medium">{featured.rating}</span>
              <span className="text-muted-foreground">
                · {featured.ratingCount}
              </span>
            </div>
            <p className="max-w-xl leading-relaxed text-muted-foreground">
              {featured.excerpt}
            </p>
            <div className="flex gap-3 pt-2">
              <Button>Kitaplığıma Ekle</Button>
              <Button variant="outline">İncelemeleri Oku</Button>
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {picks.map((book) => (
            <div key={book.title} className="flex flex-col gap-3">
              <BookCover
                title={book.title}
                author={book.author}
                tone={book.tone}
                size="md"
                className="w-full"
              />
              <div className="flex flex-col gap-0.5">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.author}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <StarRating value={book.rating} />
                  <span className="text-muted-foreground">{book.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stat band */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-heading max-w-2xl text-3xl leading-snug font-medium tracking-tight text-balance">
            &ldquo;Bir kitabı bitirmek, bir sonrakine başlamanın en güzel
            sebebidir.&rdquo;
          </p>
          <p className="mt-4 text-sm tracking-wide opacity-80 uppercase">
            DKList Reading Score — yıl sonu okuma raporun
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Keşfet</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Kategoriler
          </h2>
        </div>

        <Suspense fallback={<CategoriesSkeleton />}>
          <CategoriesShelf />
        </Suspense>
      </section>

      <Separator />

      {/* Shelf row */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Rafı Karıştır</SectionLabel>
            <h2 className="font-heading text-3xl font-medium tracking-tight">
              Yeni Eklenenler
            </h2>
          </div>
          <Button variant="ghost" className="hidden sm:inline-flex">
            Tümünü Gör →
          </Button>
        </div>

        <Suspense fallback={<LatestBooksSkeleton />}>
          <LatestBooksShelf />
        </Suspense>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <span className="font-heading text-lg font-semibold tracking-tight italic text-foreground">
            DKList
          </span>
          <p>DK List — Kitap Severlerin Buluştuğu Adres</p>
        </div>
      </footer>
    </div>
  );
}
