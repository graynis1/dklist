import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { getCategoryBySlug, getBooksByCategory } from "@/db/queries/books";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/kategori/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};

  return pageMetadata({
    title: `${cat.name} Kitapları`,
    description: `${cat.name} kategorisindeki en popüler kitapları DKList'te keşfet, puanla, okuma listene ekle.`,
    path: `/kategori/${cat.slug}`,
  });
}

export default function CategoryPage({ params, searchParams }: PageProps<"/kategori/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<CategorySkeleton />}>
        <CategoryContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="mx-auto max-w-[100rem] px-6 py-16">
      <div className="mb-10 h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-[0.35rem] bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function CategoryContent({
  params,
  searchParams,
}: {
  params: PageProps<"/kategori/[slug]">["params"];
  searchParams: PageProps<"/kategori/[slug]">["searchParams"];
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? "1") || 1;
  const cat = await getCategoryBySlug(slug);

  if (!cat) {
    notFound();
  }

  // Real customer ask: "Kategorilerde Türkçe en ilk sırada listelenmişti
  // daha önce uygulamada çok iyi olur" - see getBooksByCategory()'s own doc
  // comment for why this needed two separate queries instead of one sort.
  const { items: books, total, lastPage } = await getBooksByCategory(cat.id, page, 40);

  return (
    <section className="mx-auto max-w-[100rem] px-6 py-16 lg:py-20">
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Kategori</SectionLabel>
        <h1 className="font-heading text-4xl font-medium tracking-tight">
          {cat.name}
        </h1>
        <p className="text-muted-foreground">
          {total} kitap · Türkçe baskılar önce, sonra görüntülenmeye göre sıralı
        </p>
      </div>

      {books.length === 0 ? (
        <p className="text-muted-foreground">
          Bu kategoride henüz kitap yok.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/kitap/${book.slug}`}
                className="flex flex-col gap-3"
              >
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
                    <span className="text-muted-foreground">
                      {book.score.toFixed(1)}/10
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <PaginationNav page={page} lastPage={lastPage} hrefForPage={(p) => `/kategori/${cat.slug}?page=${p}`} />
        </>
      )}
    </section>
  );
}
