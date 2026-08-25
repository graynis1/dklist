import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { HeroShelf } from "@/components/dklist/hero-shelf";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { SectionLabel, StarRating } from "@/components/dklist/star-rating";
import { getLatestBooks, getTopCategories, getTopBooks, getRecommendedBooks } from "@/db/queries/books";
import { getTrendingBooks } from "@/db/queries/activity";
import { getTopReaders, getFollowSuggestions } from "@/db/queries/profile";
import { getWeeklyLeaderboard } from "@/db/queries/points";
import { getCurrentBookOfMonth } from "@/db/queries/book-of-month";
import { getRecentBookActivity } from "@/db/queries/activity";
import { HashtagText } from "@/components/dklist/hashtag-text";
import { currentISOWeek } from "@/lib/iso-week";
import { connection } from "next/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/auth";
import { FollowButton } from "@/components/dklist/follow-button";
import { AdSlot } from "@/components/dklist/ad-slot";
import { RecentlyViewedShelf } from "@/components/dklist/recently-viewed-shelf";

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
  await connection();
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
  await connection();
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
            bookId={featured.id}
            hasImage={featured.hasImage}
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
                bookId={book.id}
                hasImage={book.hasImage}
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
  await connection();
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

const MEDALS = ["🥇", "🥈", "🥉"];

async function WeeklyLeaderWidget() {
  // currentISOWeek() reads the real clock - needs an explicit dynamic-data
  // marker before that's allowed during prerendering (Cache Components).
  await connection();
  const week = currentISOWeek();
  const topThree = await getWeeklyLeaderboard(3, week);

  if (topThree.length === 0) {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {topThree.map((entry, i) => (
        <Link
          key={entry.userId}
          href={`/profil/${entry.username}`}
          className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
        >
          <span className="text-2xl">{MEDALS[i]}</span>
          <Avatar className="size-10 text-sm">
            <AvatarFallback>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col truncate">
            <span className="truncate font-medium">@{entry.username}</span>
            <span className="text-sm text-muted-foreground">{entry.points} puan</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function BookOfMonthWidget() {
  // getCurrentBookOfMonth()'s participant count and active pick genuinely
  // vary per-request (not cacheable) - connection() opts this subtree out
  // of static prerendering instead of Next flagging the non-deterministic
  // read as an "unstable value" error. Already inside a <Suspense> boundary
  // at the call site, matching this project's established dynamic-content
  // pattern (see PLAN.md's Next.js 16 caching notes).
  await connection();
  const current = await getCurrentBookOfMonth();
  if (!current) {
    return <p className="text-sm text-muted-foreground">Şu anda belirlenmiş bir ayın kitabı yok.</p>;
  }

  return (
    <Link
      href={`/kitap/${current.bookSlug}`}
      className="flex max-w-lg items-center gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
    >
      <BookCover
        title={current.bookName}
        author={current.writers.join(", ") || "Yazar bilinmiyor"}
        tone={toneForId(current.bookId)}
        bookId={current.bookId}
        hasImage={current.hasImage}
        size="sm"
        className="w-16 shrink-0"
      />
      <div>
        <p className="text-xs font-medium text-primary">{current.periodLabel.toUpperCase()}</p>
        <p className="font-medium">{current.bookName}</p>
        <p className="text-sm text-muted-foreground">{current.participantCount} kişi katılıyor</p>
      </div>
    </Link>
  );
}

function ActivityFeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-24 w-16 shrink-0 animate-pulse rounded-[0.35rem] bg-muted" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Customer's homepage spec: any comment/review/quote referencing a book
 * should pull that book's cover thumbnail into the feed for visual variety,
 * 1000kitap-style. Site's real "cover" is the typeset BookCover jacket
 * (design system deliberately has no photographic covers), so that's what
 * surfaces here rather than a `/kapak/[id]` photo.
 */
async function ActivityFeedShelf() {
  await connection();
  const items = await getRecentBookActivity(8);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Henüz bir etkinlik yok.</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/kitap/${item.bookSlug}`}
          className="flex gap-4 rounded-lg p-2 -m-2 transition-colors hover:bg-accent"
        >
          <BookCover
            title={item.bookName}
            author={item.writers.join(", ") || "Yazar bilinmiyor"}
            tone={toneForId(item.bookId)}
            bookId={item.bookId}
            hasImage={item.hasImage}
            size="sm"
            className="w-16 shrink-0"
          />
          <div className="flex flex-1 flex-col gap-1 py-1">
            <p className="text-sm">
              <span className="font-medium">@{item.username}</span>{" "}
              <span className="text-muted-foreground">
                {item.kind === "quotation" ? "bir alıntı paylaştı" : "bir yorum yazdı"} ·{" "}
              </span>
              <span className="font-medium">{item.bookName}</span>
            </p>
            <p className="text-sm text-muted-foreground italic">
              <HashtagText text={item.excerpt} />
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function FollowSuggestionsSkeleton() {
  return (
    <div className="flex flex-wrap gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 w-44 animate-pulse rounded-full bg-muted" />
      ))}
    </div>
  );
}

/**
 * Customer's ask: "reader-follow suggestions". Ranks other users by how
 * many "okudum" books they share with the signed-in viewer, excluding
 * people already followed - the same overlap idea as the profile page's
 * shared-interest indicator, generalized to "who" instead of "how much with
 * one specific person". Isolated in its own Suspense boundary since auth()
 * reads cookies() (per-request), same reasoning as AuthStatus.
 */
async function FollowSuggestionsWidget() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <p className="text-sm text-muted-foreground">
        Size uygun okuma arkadaşları önerileri için{" "}
        <Link href="/giris" className="underline hover:text-foreground">
          giriş yapın
        </Link>
        .
      </p>
    );
  }

  const suggestions = await getFollowSuggestions(Number(session.user.id));

  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz öneri yok - birkaç kitabı &quot;okudum&quot; olarak işaretleyince burada benzer okuyucular görünecek.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 rounded-full border border-border py-1 pr-2 pl-1 text-sm"
        >
          <Link href={`/profil/${s.username}`} className="flex items-center gap-2 hover:underline">
            <Avatar className="size-7 text-xs">
              <AvatarFallback>{s.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            @{s.username}
          </Link>
          <span className="text-xs text-muted-foreground">{s.sharedBookCount} ortak kitap</span>
          <FollowButton targetUserId={s.id} initialFollowing={false} />
        </div>
      ))}
    </div>
  );
}

function RecommendedBooksSkeleton() {
  return (
    <div className="flex gap-5 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-32 shrink-0">
          <div className="aspect-[2/3] animate-pulse rounded-[0.35rem] bg-muted" />
        </div>
      ))}
    </div>
  );
}

/**
 * Customer's ask: "Book recommendations section (Netflix-style, based on
 * past preference/history)". Plain collaborative filtering via
 * getRecommendedBooks() (no AI/paid API - readers who share your "okudum"
 * books, then whichever of THEIR books you haven't read yet). Signed-in
 * only, own Suspense boundary same as the other auth()-reading widgets.
 */
async function RecommendedBooksShelf() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <p className="text-sm text-muted-foreground">
        Size özel öneriler için{" "}
        <Link href="/giris" className="underline hover:text-foreground">
          giriş yapın
        </Link>
        .
      </p>
    );
  }

  const books = await getRecommendedBooks(Number(session.user.id), 8);

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz öneri yok - birkaç kitabı &quot;okudum&quot; olarak işaretleyince size özel öneriler burada görünecek.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-5">
      {books.map((b) => (
        <Link key={b.id} href={`/kitap/${b.slug}`} className="flex w-32 shrink-0 flex-col gap-2">
          <BookCover
            title={b.name}
            author={b.writers.join(", ") || "Yazar bilinmiyor"}
            tone={toneForId(b.id)}
            bookId={b.id}
            hasImage={b.hasImage}
            size="sm"
            className="w-full"
          />
          <p className="truncate text-xs font-medium">{b.name}</p>
          <p className="text-xs text-muted-foreground">
            {b.readerOverlap} benzer okuyucu okudu
          </p>
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
  await connection();
  const books = await getLatestBooks(12);

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz kitap eklenmedi.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-5">
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
            bookId={book.id}
            hasImage={book.hasImage}
            size="sm"
            className="w-full"
          />
          <p className="truncate text-xs font-medium">{book.name}</p>
        </Link>
      ))}
    </div>
  );
}

async function TrendingBooksShelf() {
  await connection();
  const books = await getTrendingBooks(12);

  if (books.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Bu hafta henüz yeterince yorum yapılmadı.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-5">
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
            bookId={book.id}
            hasImage={book.hasImage}
            size="sm"
            className="w-full"
          />
          <p className="truncate text-xs font-medium">{book.name}</p>
          <p className="text-xs text-muted-foreground">{book.recentCommentCount} yorum bu hafta</p>
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

      <RecentlyViewedShelf />

      <Separator />

      <div className="py-8">
        <Suspense fallback={null}>
          <AdSlot placement="homepage-banner" />
        </Suspense>
      </div>

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

      {/* "Trend Kitaplar" - a new discovery widget, most-discussed-this-week. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Keşfet</SectionLabel>
            <h2 className="font-heading text-3xl font-medium tracking-tight">
              Trend Kitaplar
            </h2>
          </div>
        </div>

        <Suspense fallback={<LatestBooksSkeleton />}>
          <TrendingBooksShelf />
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

      {/* Weekly points leaderboard - real engagement bait for the
          gamification/points system: every visitor sees who's currently
          winning the week's free-book prize. Customer's ask for a
          dedicated "bu haftanın top 10/top 20" area - top 3 here, full
          top 10/20 (with toggle) at /puan-tablosu. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <SectionLabel>Etkileşim</SectionLabel>
            <h2 className="font-heading text-3xl font-medium tracking-tight">
              Bu Haftanın Liderleri
            </h2>
          </div>
          <Link href="/puan-tablosu" className="text-sm text-muted-foreground underline hover:text-foreground">
            Tüm Tabloyu Gör
          </Link>
        </div>

        <Suspense fallback={<WeeklyLeaderSkeleton />}>
          <WeeklyLeaderWidget />
        </Suspense>
      </section>

      <Separator />

      {/* "Ayın Kitabı" - community-read pick, sixth item from the "what else
          could be added" brainstorm list. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <SectionLabel>Topluluk</SectionLabel>
            <h2 className="font-heading text-3xl font-medium tracking-tight">
              Ayın Kitabı
            </h2>
          </div>
          <Link href="/ayin-kitabi" className="text-sm text-muted-foreground underline hover:text-foreground">
            Tümünü Gör
          </Link>
        </div>

        <Suspense fallback={<WeeklyLeaderSkeleton />}>
          <BookOfMonthWidget />
        </Suspense>
      </section>

      <Separator />

      {/* Recent activity feed - comments/quotes referencing a book pull that
          book's cover thumbnail in, 1000kitap-style. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SectionLabel>Akış</SectionLabel>
            <h2 className="font-heading text-3xl font-medium tracking-tight">
              Son Etkinlikler
            </h2>
          </div>
          <Link
            href="/akis"
            className="text-sm font-medium text-primary hover:underline"
          >
            Tüm Akışı Gör →
          </Link>
        </div>

        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeedShelf />
        </Suspense>
      </section>

      <Separator />

      {/* Reader-follow suggestions - customer's ask, ranked by shared
          "okudum" books with people not yet followed. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Keşfet</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Takip Edebileceğin Kişiler
          </h2>
        </div>

        <Suspense fallback={<FollowSuggestionsSkeleton />}>
          <FollowSuggestionsWidget />
        </Suspense>
      </section>

      <Separator />

      {/* Personalized recommendations - collaborative filtering via shared
          "okudum" overlap, no AI/paid API needed. */}
      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Senin İçin</SectionLabel>
          <h2 className="font-heading text-3xl font-medium tracking-tight">
            Sana Özel Öneriler
          </h2>
        </div>

        <Suspense fallback={<RecommendedBooksSkeleton />}>
          <RecommendedBooksShelf />
        </Suspense>
      </section>
    </div>
  );
}
