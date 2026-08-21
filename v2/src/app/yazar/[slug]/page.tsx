import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating, SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EntityLikeButton } from "@/components/dklist/entity-like-button";
import { RateEntityControl } from "@/components/dklist/rate-entity-control";
import { EntityComments } from "@/components/dklist/entity-comments";
import { Separator } from "@/components/ui/separator";
import { getWriterBySlug, getBooksByWriter } from "@/db/queries/writers";
import { isWriterLiked, getWriterLikeCount } from "@/db/queries/likes";
import { getUserWriterRating } from "@/db/queries/rating";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { getAuthorMemberForWriter } from "@/db/queries/yazarhane";
import { JsonLd } from "@/components/dklist/json-ld";
import { auth } from "@/auth";
import {
  toggleWriterLikeAction,
  rateWriterAction,
  addWriterCommentAction,
  addWriterReplyAction,
  shareWriterCommentAction,
} from "./actions";

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

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const [books, liked, likeCount, userRating, comments, authorMember] = await Promise.all([
    getBooksByWriter(writer.id),
    userId ? isWriterLiked(userId, writer.id) : Promise.resolve(false),
    getWriterLikeCount(writer.id),
    userId ? getUserWriterRating(userId, writer.id) : Promise.resolve(null),
    getEntityComments(writer.id, "writer"),
    getAuthorMemberForWriter(writer.id),
  ]);
  const quotes = await getEntityComments(writer.id, "writer", "alinti");

  const commentIds = comments.map((c) => c.id);
  const [repliesByComment, commentLikes] = await Promise.all([
    getRepliesForComments(commentIds),
    getCommentLikeStates(userId, commentIds),
  ]);
  const repliesByCommentObj = Object.fromEntries(repliesByComment);

  const quoteIds = quotes.map((c) => c.id);
  const [repliesByQuote, quoteLikes] = await Promise.all([
    getRepliesForComments(quoteIds),
    getCommentLikeStates(userId, quoteIds),
  ]);
  const repliesByQuoteObj = Object.fromEntries(repliesByQuote);
  const initials = writer.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: writer.name,
          ...(writer.biyo ? { description: writer.biyo } : {}),
        }}
      />
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
            <span className="font-medium">{writer.score.toFixed(2)}/10</span>
            <span className="text-muted-foreground">
              · {books.length} kitap
            </span>
          </div>
        </div>
        <div className="sm:ml-auto">
          <EntityLikeButton
            entityId={writer.id}
            signedIn={Boolean(userId)}
            initialLiked={liked}
            initialCount={likeCount}
            toggleAction={toggleWriterLikeAction}
          />
        </div>
      </div>

      <div className="mb-10">
        <RateEntityControl
          signedIn={Boolean(userId)}
          initialUserRating={userRating}
          rateAction={rateWriterAction.bind(null, writer.id, writer.slug)}
        />
      </div>

      {writer.biyo && (
        <p className="mb-6 max-w-2xl leading-relaxed text-muted-foreground">
          {writer.biyo}
        </p>
      )}

      {authorMember && (
        <Link
          href={`/yazarhane/${authorMember.username}`}
          className="mb-10 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/15"
        >
          ✎ Bu yazar DKList Yazarhanesi&apos;nde - ziyaret et →
        </Link>
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
                    {book.score.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Separator className="my-16" />

      <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
        Yorumlar
      </h2>
      <EntityComments
        signedIn={Boolean(userId)}
        initialComments={comments}
        initialRepliesByComment={repliesByCommentObj}
        commentLikes={commentLikes}
        addCommentAction={addWriterCommentAction.bind(null, writer.id, "yorum")}
        addReplyAction={addWriterReplyAction}
        shareCommentAction={shareWriterCommentAction}
        placeholder="Bu yazar hakkında ne düşünüyorsunuz?"
      />

      <Separator className="my-16" />

      <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
        Alıntılar
      </h2>
      <EntityComments
        signedIn={Boolean(userId)}
        initialComments={quotes}
        initialRepliesByComment={repliesByQuoteObj}
        commentLikes={quoteLikes}
        addCommentAction={addWriterCommentAction.bind(null, writer.id, "alinti")}
        addReplyAction={addWriterReplyAction}
        shareCommentAction={shareWriterCommentAction}
        placeholder="Bu yazardan bir alıntı paylaşın…"
        submitLabel="Alıntı Yap"
        emptyMessage="Henüz alıntı yok."
      />
    </section>
  );
}
