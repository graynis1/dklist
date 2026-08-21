import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating } from "@/components/dklist/star-rating";
import { ReadStatusControl } from "@/components/dklist/read-status-control";
import { RateBookControl } from "@/components/dklist/rate-book-control";
import { EntityComments } from "@/components/dklist/entity-comments";
import { LibraryToggle } from "@/components/dklist/library-toggle";
import { LikeButton } from "@/components/dklist/like-button";
import { ShareAttachmentButton } from "@/components/dklist/share-attachment-button";
import { ShareButton } from "@/components/dklist/share-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getBookBySlug, getBookReaders } from "@/db/queries/book-detail";
import { auth } from "@/auth";
import { getReadStatus, getBookDropStats, DROP_REASON_LABELS } from "@/db/queries/reading-status";
import { getUserBookRating } from "@/db/queries/rating";
import { getBookComments, getRepliesForComments } from "@/db/queries/comments";
import { isInLibrary } from "@/db/queries/library";
import { isBookLiked, getBookLikeCount } from "@/db/queries/likes";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { addCommentAction, addReplyAction } from "./actions";

const READER_STATUS_LABELS: Record<string, string> = {
  okudum: "okudu",
  okuyorum: "okuyor",
  okuyacagim: "okuyacak",
  "yarida-birakildi": "yarıda bıraktı",
};

export default function BookPage({ params }: PageProps<"/kitap/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<BookDetailSkeleton />}>
        <BookDetailContent params={params} />
      </Suspense>
    </div>
  );
}

function BookDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-6 py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
        <div className="aspect-[2/3] w-full max-w-[280px] rounded-[0.35rem] bg-muted" />
        <div className="flex flex-col gap-4">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-10 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

async function BookDetailContent({
  params,
}: {
  params: PageProps<"/kitap/[slug]">["params"];
}) {
  const { slug } = await params;
  const detail = await getBookBySlug(slug);

  if (!detail) {
    notFound();
  }

  const tone = toneForId(detail.id);
  const writerNames = detail.writers.map((w) => w.name).join(", ") || "Yazar bilinmiyor";

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const [
    currentStatus,
    dropStats,
    userRating,
    comments,
    inLibrary,
    liked,
    likeCount,
    readers,
  ] = await Promise.all([
    userId ? getReadStatus(userId, detail.id) : Promise.resolve(null),
    getBookDropStats(detail.id),
    userId ? getUserBookRating(userId, detail.id) : Promise.resolve(null),
    getBookComments(detail.id),
    userId ? isInLibrary(userId, detail.id) : Promise.resolve(false),
    userId ? isBookLiked(userId, detail.id) : Promise.resolve(false),
    getBookLikeCount(detail.id),
    getBookReaders(detail.id),
  ]);

  const quotes = await getBookComments(detail.id, "alinti");

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

  return (
    <>
      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          <BookCover
            title={detail.name}
            author={writerNames}
            tone={tone}
            size="lg"
            className="mx-auto w-full max-w-[280px] lg:mx-0"
          />

          <div className="flex flex-col justify-center gap-4">
            {detail.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.categories.map((c) => (
                  <Link key={c.id} href={`/kategori/${c.slug}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-accent">
                      {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            <h1 className="font-heading text-4xl font-medium tracking-tight text-balance">
              {detail.name}
            </h1>
            {detail.orgName && detail.orgName !== detail.name && (
              <p className="text-sm text-muted-foreground italic">
                Orijinal adı: {detail.orgName}
              </p>
            )}

            <p className="text-lg text-muted-foreground">
              {detail.writers.length > 0
                ? detail.writers.map((w, i) => (
                    <span key={w.id}>
                      {i > 0 && ", "}
                      <Link
                        href={`/yazar/${w.slug}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {w.name}
                      </Link>
                    </span>
                  ))
                : "Yazar bilinmiyor"}
            </p>

            {detail.translators.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Çeviren:{" "}
                {detail.translators.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 && ", "}
                    <Link
                      href={`/cevirmen/${t.slug}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {t.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StarRating value={detail.score} />
              <span className="font-medium">{detail.score.toFixed(2)}/10</span>
              <span className="text-muted-foreground">
                · {detail.viewCount.toLocaleString("tr-TR")} görüntülenme
              </span>
              {detail.pageNumber > 0 && (
                <span className="text-muted-foreground">
                  · {detail.pageNumber} sayfa
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <RateBookControl
                bookId={detail.id}
                bookSlug={detail.slug}
                signedIn={Boolean(userId)}
                initialUserRating={userRating}
              />
              <LikeButton
                bookId={detail.id}
                signedIn={Boolean(userId)}
                initialLiked={liked}
                initialCount={likeCount}
              />
              {userId && <ShareAttachmentButton attachmentType="book" referencedId={detail.id} />}
              <ShareButton content={detail.name} />
            </div>

            {detail.publisher && (
              <p className="text-sm text-muted-foreground">
                Yayınevi:{" "}
                <Link
                  href={`/yayinevi/${detail.publisher.slug}`}
                  className="text-foreground hover:underline"
                >
                  {detail.publisher.name}
                </Link>
              </p>
            )}

            <ReadStatusControl
              bookId={detail.id}
              signedIn={Boolean(userId)}
              initialStatus={currentStatus}
            />

            {dropStats.droppedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {dropStats.droppedCount} okur bu kitabı yarıda bıraktı
                {dropStats.avgDropPercentage != null &&
                  ` (ortalama %${dropStats.avgDropPercentage} noktasında)`}
                {Object.keys(dropStats.reasonCounts).length > 0 && (
                  <>
                    {" — "}
                    {Object.entries(dropStats.reasonCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(
                        ([reason, count]) =>
                          `${DROP_REASON_LABELS[reason as keyof typeof DROP_REASON_LABELS]} (${count})`,
                      )
                      .join(", ")}
                  </>
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <LibraryToggle
                bookId={detail.id}
                signedIn={Boolean(userId)}
                initialInLibrary={inLibrary}
              />
              <Button variant="outline">Askıya Bırak</Button>
              <Button variant="ghost">Şikayet Et</Button>
            </div>
          </div>
        </div>
      </section>

      {readers.length > 0 && (
        <>
          <Separator />
          <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
            <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
              Bu Kitabı Okuyan Üyeler
            </h2>
            <div className="flex flex-wrap gap-4">
              {readers.map((r) => (
                <Link
                  key={r.id}
                  href={`/profil/${r.username}`}
                  className="flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm hover:bg-accent"
                >
                  <Avatar className="size-6 text-[10px]">
                    <AvatarFallback>
                      {r.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {r.username}
                  <span className="text-xs text-muted-foreground">
                    {READER_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <Separator />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
          Yorumlar
        </h2>
        <EntityComments
          signedIn={Boolean(userId)}
          initialComments={comments}
          initialRepliesByComment={repliesByCommentObj}
          commentLikes={commentLikes}
          addCommentAction={addCommentAction.bind(null, detail.id, "yorum")}
          addReplyAction={addReplyAction}
          placeholder="Bu kitap hakkında ne düşünüyorsunuz?"
        />
      </section>

      <Separator />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
          Alıntılar
        </h2>
        <EntityComments
          signedIn={Boolean(userId)}
          initialComments={quotes}
          initialRepliesByComment={repliesByQuoteObj}
          commentLikes={quoteLikes}
          addCommentAction={addCommentAction.bind(null, detail.id, "alinti")}
          addReplyAction={addReplyAction}
          placeholder="Bu kitaptan bir alıntı paylaşın…"
          submitLabel="Alıntı Yap"
          emptyMessage="Henüz alıntı yok."
        />
      </section>
    </>
  );
}
