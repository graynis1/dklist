import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { getPublisherBySlug, getBooksByPublisher } from "@/db/queries/publishers";
import { JsonLd } from "@/components/dklist/json-ld";

export default function PublisherPage({ params }: PageProps<"/yayinevi/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<PublisherSkeleton />}>
        <PublisherContent params={params} />
      </Suspense>
    </div>
  );
}

function PublisherSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-[0.35rem] bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function PublisherContent({
  params,
}: {
  params: PageProps<"/yayinevi/[slug]">["params"];
}) {
  const { slug } = await params;
  const publisher = await getPublisherBySlug(slug);

  if (!publisher) {
    notFound();
  }

  const books = await getBooksByPublisher(publisher.id);

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: publisher.name,
        }}
      />
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <SectionLabel>Yayınevi</SectionLabel>
          <h1 className="font-heading text-4xl font-medium tracking-tight">
            {publisher.name}
          </h1>
          <p className="text-muted-foreground">{books.length} kitap</p>
        </div>
        <Button variant="outline">Takip Et</Button>
      </div>

      {books.length === 0 ? (
        <p className="text-muted-foreground">
          Bu yayınevine ait kitap bulunmuyor.
        </p>
      ) : (
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
      )}
    </section>
  );
}
