import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { HeroShelf } from "@/components/dklist/hero-shelf";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { getLatestBooks, getTopCategories, getTopBooks } from "@/db/queries/books";
import { getTopReaders } from "@/db/queries/profile";
import { getWeeklyLeaderboard } from "@/db/queries/points";
import { currentISOWeek } from "@/lib/iso-week";
import { connection } from "next/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
      <div className="mx-auto aspect-[2/3] w-full max-w-[280px] animate-pulse rounded-[0.35rem] bg-muted lg:mx-0" />
      <div className="flex flex-col justify-center gap-4">
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * v1's GeneralController::getTopItems()/getTopBooks() (top-3 by view count) -
 * the homepage's "featured"/"picks" sections previously rendered placeholder
 * demoBooks data regardless of what was actually in the catalog. `content`
 * (the book's blurb/description column) stands in for the hand-written demo
 * excerpt; there's no "genre" or curated "editor's pick" concept in v1 at
 * all, so the badge now shows the book's rank by view count instead of
 * inventing a category label that doesn't exist in the schema.
 */
async function FeaturedSection() {
  const topBooks = await getTopBooks(5);

  if (topBooks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Henüz kitap eklenmedi.</p>
    );
  }

  const [featured, ...picks] = topBooks;
  const writerNames = featured.writers.join(", ") || "Yazar bilinmiyor";

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
        <Link href={`/kitap/${featured.slug}`} className="mx-auto w-full max-w-[280px] lg:mx-0">
          <BookCover
            title={featured.name}
            author={writerNames}
            tone={toneForId(featured.id)}
            size="lg"
            className="w-full"
          />
        </Link>
        <div className="flex flex-col justify-center gap-4">
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
            En Çok Görüntülenen
          </span>
          <Link href={`/kitap/${featured.slug}`}>
            <h3 className="font-heading text-4xl font-medium tracking-tight hover:text-primary">
              {featured.name}
            </h3>
          </Link>
          <p className="text-lg text-muted-foreground">{writerNames}</p>
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={featured.score} />
            <span className="font-medium">{featured.score.toFixed(1)}/10</span>
            <span className="text-muted-foreground">
              · {featured.viewCount.toLocaleString("tr-TR")} görüntülenme
            </span>
          </div>
          {featured.content && (
            <p className="max-w-xl leading-relaxed text-muted-foreground line-clamp-3">
              {featured.content}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Link href={`/kitap/${featured.slug}`}>
              <Button>İncelemeleri Oku</Button>
            </Link>
          </div>
        </div>
      </div>

      {picks.length > 0 && (
        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {picks.map((book) => (
            <Link key={book.id} href={`/kitap/${book.slug}`} className="flex flex-col gap-3">
              <BookCover
                title={book.name}
                author={book.writers.join(", ") || "Yazar bilinmiyor"}
                tone={toneForId(book.id)}
                size="md"
                className="w-full"
              />
              <div className="flex flex-col gap-0.5">
                <p className="truncate text-sm font-medium">{book.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {book.writers.join(", ") || "Yazar bilinmiyor"}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  <StarRating value={book.score} />
                  <span className="text-muted-foreground">{book.score.toFixed(1)}/10</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function TopReadersSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-9 w-24 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  );
}

/**
 * v1's UserController::getTopUsers() - top readers by total `read` row
 * count. No dedicated page in v1 for this either, just a widget - homepage
 * is the natural spot, same as Kategoriler/Yeni Eklenenler.
 */
async function TopReadersShelf() {
  const readers = await getTopReaders(12);

  if (readers.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz okuma kaydı yok.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {readers.map((r) => (
        <Link
          key={r.id}
          href={`/profil/${r.username}`}
          className="flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm transition-colors hover:bg-accent"
        >
          <Avatar className="size-7 text-xs">
            <AvatarFallback>{r.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          @{r.username}
          <span className="text-xs text-muted-foreground">{r.readCount} kitap</span>
        </Link>
      ))}
    </div>
  );
}

function WeeklyLeaderSkeleton() {
  return <div className="h-16 w-full max-w-sm animate-pulse rounded-lg bg-muted" />;
}

async function WeeklyLeaderWidget() {
  // currentISOWeek() reads the real clock - needs an explicit dynamic-data
  // marker before that's allowed during prerendering (Cache Components).
  await connection();
  const week = currentISOWeek();
  const [leader] = await getWeeklyLeaderboard(1, week);

  if (!leader) {
    return (
      <p className="text-sm text-muted-foreground">
        Bu hafta henüz kimse puan kazanmadı -{" "}
        <Link href="/puan-tablosu" className="underline hover:text-foreground">
          ilk sen ol
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex max-w-sm items-center gap-4 rounded-lg border border-border p-4">
      <Avatar className="size-12 text-lg">
        <AvatarFallback>{leader.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <Link href={`/profil/${leader.username}`} className="font-medium hover:underline">
          @{leader.username}
        </Link>
        <span className="text-sm text-muted-foreground">{leader.points} puan · bu hafta lider</span>
      </div>
      <Link
        href="/puan-tablosu"
        className="ml-auto text-sm text-muted-foreground underline hover:text-foreground"
      >
        Tabloyu Gör
      </Link>
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
          <SectionLabel>Öne Çıkanlar</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            En çok görüntülenen kitap
          </h2>
        </div>

        <Suspense fallback={<FeaturedSkeleton />}>
          <FeaturedSection />
        </Suspense>
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

      <Separator />

      {/* Top readers */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            En Aktif Okurlar
          </h2>
        </div>

        <Suspense fallback={<TopReadersSkeleton />}>
          <TopReadersShelf />
        </Suspense>
      </section>

      <Separator />

      {/* Weekly points leader - real engagement bait for the gamification/
          points system: every visitor sees who's currently winning the
          week's free-book prize. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Etkileşim</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Bu Haftanın Lideri
          </h2>
        </div>

        <Suspense fallback={<WeeklyLeaderSkeleton />}>
          <WeeklyLeaderWidget />
        </Suspense>
      </section>
    </div>
  );
}
