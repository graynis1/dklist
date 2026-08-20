import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getWriterBySlug, getBooksByWriter } from "@/db/queries/writers";

export default function WriterPage({ params }: PageProps<"/yazar/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<WriterSkeleton />}>
        <WriterContent params={params} />
      </Suspense>
    </div>
  );
}

function WriterSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-[0.35rem] bg-muted" />
        ))}
      </div>
    </div>
  );
}

async function WriterContent({
  params,
}: {
  params: PageProps<"/yazar/[slug]">["params"];
}) {
  const { slug } = await params;
  const writer = await getWriterBySlug(slug);

  if (!writer) {
    notFound();
  }

  const books = await getBooksByWriter(writer.id);
  const initials = writer.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-20 text-xl">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <SectionLabel>Yazar</SectionLabel>
          <h1 className="font-heading text-4xl font-medium tracking-tight">
            {writer.name}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={writer.score} />
            <span className="font-medium">{writer.score.toFixed(2)}</span>
            <span className="text-muted-foreground">
              · {books.length} kitap
            </span>
          </div>
        </div>
        <Button variant="outline" className="sm:ml-auto">
          Takip Et
        </Button>
      </div>

      {writer.biyo && (
        <p className="mb-10 max-w-2xl leading-relaxed text-muted-foreground">
          {writer.biyo}
        </p>
      )}

      <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
        Kitapları
      </h2>

      {books.length === 0 ? (
        <p className="text-muted-foreground">
          Bu yazara ait kitap bulunmuyor.
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
                author={writer.name}
                tone={toneForId(book.id)}
                size="md"
                className="w-full"
              />
              <div className="flex flex-col gap-0.5">
                <p className="truncate text-sm font-medium">{book.name}</p>
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
      )}
    </section>
  );
}
