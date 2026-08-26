import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { EntityLikeButton } from "@/components/dklist/entity-like-button";
import { getPublisherBySlug, getBooksByPublisher } from "@/db/queries/publishers";
import { isPublisherLiked, getPublisherLikeCount } from "@/db/queries/likes";
import { JsonLd } from "@/components/dklist/json-ld";
import { auth } from "@/auth";
import { pageMetadata } from "@/lib/seo";
import { togglePublisherLikeAction } from "./actions";

export async function generateMetadata({ params }: PageProps<"/yayinevi/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const publisher = await getPublisherBySlug(slug);
  if (!publisher) return {};

  return pageMetadata({
    title: `${publisher.name} (Yayınevi)`,
    description: `${publisher.name} yayınevine ait kitapları DKList'te keşfet, okuma durumunu takip et, puanla.`,
    path: `/yayinevi/${publisher.slug}`,
  });
}

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
    <div className="mx-auto max-w-6xl px-6 py-16">
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

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const [books, liked, likeCount] = await Promise.all([
    getBooksByPublisher(publisher.id),
    userId ? isPublisherLiked(userId, publisher.id) : Promise.resolve(false),
    getPublisherLikeCount(publisher.id),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: publisher.name,
        }}
      />
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-5">
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-xl text-xl font-semibold"
            style={{
              backgroundColor: TONE_STYLE[toneForId(publisher.id)].bg,
              color: TONE_STYLE[toneForId(publisher.id)].fg,
            }}
          >
            {publisher.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="flex flex-col gap-2">
            <SectionLabel>Yayınevi</SectionLabel>
            <h1 className="font-heading text-4xl font-medium tracking-tight">
              {publisher.name}
            </h1>
            <p className="text-muted-foreground">{books.length} kitap</p>
          </div>
        </div>
        <EntityLikeButton
          entityId={publisher.id}
          signedIn={Boolean(userId)}
          initialLiked={liked}
          initialCount={likeCount}
          toggleAction={togglePublisherLikeAction}
          label="Takip Et"
        />
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
      )}
    </section>
  );
}
