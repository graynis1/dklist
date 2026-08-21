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
import { getTranslatorBySlug, getBooksByTranslator } from "@/db/queries/translators";
import { isTranslatorLiked, getTranslatorLikeCount } from "@/db/queries/likes";
import { getUserTranslatorRating } from "@/db/queries/rating";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { auth } from "@/auth";
import {
  toggleTranslatorLikeAction,
  rateTranslatorAction,
  addTranslatorCommentAction,
  addTranslatorReplyAction,
} from "./actions";

export default function TranslatorPage({ params }: PageProps<"/cevirmen/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<TranslatorSkeleton />}>
        <TranslatorContent params={params} />
      </Suspense>
    </div>
  );
}

function TranslatorSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 flex items-center gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

async function TranslatorContent({
  params,
}: {
  params: PageProps<"/cevirmen/[slug]">["params"];
}) {
  const { slug } = await params;
  const translator = await getTranslatorBySlug(slug);

  if (!translator) {
    notFound();
  }

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const [books, liked, likeCount, userRating, comments] = await Promise.all([
    getBooksByTranslator(translator.id),
    userId ? isTranslatorLiked(userId, translator.id) : Promise.resolve(false),
    getTranslatorLikeCount(translator.id),
    userId ? getUserTranslatorRating(userId, translator.id) : Promise.resolve(null),
    getEntityComments(translator.id, "translator"),
  ]);
  const quotes = await getEntityComments(translator.id, "translator", "alinti");

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
  const initials = translator.name
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
          <SectionLabel>Çevirmen</SectionLabel>
          <h1 className="font-heading text-4xl font-medium tracking-tight">
            {translator.name}
          </h1>
          <div className="flex items-center gap-2 text-sm">
            <StarRating value={translator.score} />
            <span className="font-medium">{translator.score.toFixed(2)}/10</span>
            <span className="text-muted-foreground">
              · {books.length} çeviri
            </span>
          </div>
        </div>
        <div className="sm:ml-auto">
          <EntityLikeButton
            entityId={translator.id}
            signedIn={Boolean(userId)}
            initialLiked={liked}
            initialCount={likeCount}
            toggleAction={toggleTranslatorLikeAction}
          />
        </div>
      </div>

      <div className="mb-10">
        <RateEntityControl
          signedIn={Boolean(userId)}
          initialUserRating={userRating}
          rateAction={rateTranslatorAction.bind(null, translator.id, translator.slug)}
        />
      </div>

      {translator.biyo && (
        <p className="mb-10 max-w-2xl leading-relaxed text-muted-foreground">
          {translator.biyo}
        </p>
      )}

      <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
        Çevirileri
      </h2>

      {books.length === 0 ? (
        <p className="text-muted-foreground">Çeviri bulunmuyor.</p>
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
                author={translator.name}
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
        addCommentAction={addTranslatorCommentAction.bind(null, translator.id, "yorum")}
        addReplyAction={addTranslatorReplyAction}
        placeholder="Bu çevirmen hakkında ne düşünüyorsunuz?"
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
        addCommentAction={addTranslatorCommentAction.bind(null, translator.id, "alinti")}
        addReplyAction={addTranslatorReplyAction}
        placeholder="Bu çevirmenden bir alıntı paylaşın…"
        submitLabel="Alıntı Yap"
        emptyMessage="Henüz alıntı yok."
      />
    </section>
  );
}
