import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { StarRating } from "@/components/dklist/star-rating";
import { ReadStatusControl } from "@/components/dklist/read-status-control";
import { RateBookControl } from "@/components/dklist/rate-book-control";
import { EntityComments } from "@/components/dklist/entity-comments";
import { LibraryToggle } from "@/components/dklist/library-toggle";
import { LikeButton } from "@/components/dklist/like-button";
import { ShareAttachmentButton } from "@/components/dklist/share-attachment-button";
import { RecentlyViewedTracker } from "@/components/dklist/recently-viewed-tracker";
import { ShareButton } from "@/components/dklist/share-button";
import { ReadingProgressShareCard } from "@/components/dklist/reading-progress-share-card";
import { AdSlot } from "@/components/dklist/ad-slot";
import { JsonLd } from "@/components/dklist/json-ld";
import { ReportBookErrorButton } from "@/components/dklist/report-book-error-button";
import { AddToListButton } from "@/components/dklist/add-to-list-button";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { getBookBySlug, getBookReaders, getBookReaderCount, getBookCategoryRank, getWorkPooledScore, getWorkEditions, getSimilarBooks } from "@/db/queries/book-detail";
import { auth } from "@/auth";
import { getReadStatus, getBookDropStats, DROP_REASON_LABELS } from "@/db/queries/reading-status";
import { getUserBookRating, getBookRatingCount } from "@/db/queries/rating";
import { getBookComments, getRepliesForComments } from "@/db/queries/comments";
import { isInLibrary } from "@/db/queries/library";
import { isBookLiked, getBookLikeCount } from "@/db/queries/likes";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { getActiveStoreListingsForBook } from "@/db/queries/store";
import { addCommentAction, addReplyAction, shareCommentAction } from "./actions";

const READER_STATUS_LABELS: Record<string, string> = {
  finishRead: "okudu",
  currentRead: "okuyor",
  targetRead: "okuyacak",
  dropRead: "yarıda bıraktı",
};

export async function generateMetadata({ params }: PageProps<"/kitap/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return {};

  const writerNames = book.writers.map((w) => w.name).join(", ");
  const title = writerNames ? `${book.name} - ${writerNames}` : book.name;
  const description = truncateDescription(
    book.content || book.aiSummary || `${book.name}${writerNames ? ` (${writerNames})` : ""} - DKList'te oku, puanla, yorum yap.`,
  );

  return pageMetadata({ title, description, path: `/kitap/${book.slug}` });
}

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
    <div className="mx-auto max-w-6xl animate-pulse px-6 py-20">
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
    ratingCount,
    comments,
    inLibrary,
    liked,
    likeCount,
    readers,
    readerCount,
    categoryRank,
    workPooledScore,
    storeListings,
    workEditions,
    similarBooks,
  ] = await Promise.all([
    userId ? getReadStatus(userId, detail.id) : Promise.resolve(null),
    getBookDropStats(detail.id),
    userId ? getUserBookRating(userId, detail.id) : Promise.resolve(null),
    getBookRatingCount(detail.id),
    getBookComments(detail.id),
    userId ? isInLibrary(userId, detail.id) : Promise.resolve(false),
    userId ? isBookLiked(userId, detail.id) : Promise.resolve(false),
    getBookLikeCount(detail.id),
    getBookReaders(detail.id),
    getBookReaderCount(detail.id),
    detail.categories.length > 0
      ? getBookCategoryRank(detail.id, detail.categories[0].id, detail.categories[0].name, detail.score)
      : Promise.resolve(null),
    detail.workId ? getWorkPooledScore(detail.workId) : Promise.resolve(null),
    getActiveStoreListingsForBook(detail.id),
    detail.workId
      ? getWorkEditions(detail.workId, detail.id, detail.lang)
      : Promise.resolve({ sameLanguage: [], otherLanguages: {} }),
    detail.categories.length > 0 ? getSimilarBooks(detail.id, detail.categories[0].id) : Promise.resolve([]),
  ]);

  const quotes = await getBookComments(detail.id, "quotation");

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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: detail.name,
          ...(detail.orgName && detail.orgName !== detail.name ? { alternateName: detail.orgName } : {}),
          author: detail.writers.map((w) => ({ "@type": "Person", name: w.name })),
          ...(detail.translators.length > 0 ? { translator: detail.translators.map((t) => ({ "@type": "Person", name: t.name })) } : {}),
          ...(detail.publisher ? { publisher: { "@type": "Organization", name: detail.publisher.name } } : {}),
          inLanguage: detail.lang,
          ...(detail.pageNumber > 0 ? { numberOfPages: detail.pageNumber } : {}),
          ...(ratingCount > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: detail.score,
                  bestRating: 10,
                  worstRating: 1,
                  ratingCount,
                },
              }
            : {}),
        }}
      />
      <RecentlyViewedTracker
        id={detail.id}
        name={detail.name}
        slug={detail.slug}
        hasImage={detail.hasImage}
        writers={detail.writers.map((w) => w.name)}
      />
      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          <BookCover
            title={detail.name}
            author={writerNames}
            tone={tone}
            bookId={detail.id}
            hasImage={detail.hasImage}
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

            {/* Real customer ask: the pooled ("ortak") score across every
                edition should read as the dominant number - readers care
                about the book's overall reputation first, then which
                specific edition/baskı is best, "arayış sıralamasında"
                (search-priority order) reversed from how this used to
                render. Also fixed to a single decimal place everywhere
                (was .toFixed(2) here specifically, e.g. "9,83/10" - every
                other score on the site already uses one digit). */}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StarRating value={workPooledScore ? workPooledScore.avgScore : detail.score} />
              <span className="font-medium">
                {workPooledScore
                  ? `Ortak kitap puanı ${workPooledScore.avgScore.toFixed(1)}/10 (${workPooledScore.editionCount} baskı)`
                  : `${detail.score.toFixed(1)}/10`}
              </span>
              {/* Real gap found while wiring this up: ratingCount was
                  already fetched but only ever used in the invisible
                  JSON-LD SEO block below, never shown to a real visitor -
                  customer's explicit ask ("kaç kişi oy kullandı verisi
                  eklenebilir mi"). */}
              {ratingCount > 0 && (
                <span className="text-muted-foreground">({ratingCount} oy)</span>
              )}
              {workPooledScore && (
                <span className="text-muted-foreground">
                  · Bu baskının puanı {detail.score.toFixed(1)}/10
                </span>
              )}
              <span className="text-muted-foreground">
                · {detail.viewCount.toLocaleString("tr-TR")} görüntülenme
              </span>
              {detail.pageNumber > 0 && (
                <span className="text-muted-foreground">
                  · {detail.pageNumber} sayfa
                </span>
              )}
              {readerCount > 0 && (
                <span className="text-muted-foreground">
                  · {readerCount.toLocaleString("tr-TR")} okur
                </span>
              )}
              {categoryRank && categoryRank.totalInCategory > 1 && (
                <span className="text-muted-foreground">
                  · {categoryRank.categoryName} kategorisinde {categoryRank.rank}. sırada ({categoryRank.totalInCategory.toLocaleString("tr-TR")} kitap arasında)
                </span>
              )}
            </div>

            {(detail.content || detail.aiSummary) && (
              <div className="flex flex-col gap-1.5">
                <p className="leading-relaxed text-muted-foreground">
                  {detail.content || detail.aiSummary}
                </p>
                {!detail.content && detail.aiSummary && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium text-secondary-foreground">
                    ✨ AI tarafından oluşturuldu
                  </span>
                )}
              </div>
            )}

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
              <ShareButton content={detail.name} pointsKey={`book:${detail.id}`} />
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

            {currentStatus && currentStatus.status !== "targetRead" && (
              <ReadingProgressShareCard
                bookTitle={detail.name}
                author={writerNames}
                tone={tone}
                status={currentStatus.status as "currentRead" | "finishRead" | "dropRead"}
                rating={userRating}
                dropPercentage={currentStatus.dropPercentage}
              />
            )}

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

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <LibraryToggle
                bookId={detail.id}
                signedIn={Boolean(userId)}
                initialInLibrary={inLibrary}
              />
              <Button variant="outline" render={<Link href="/askida-kitap/yeni" />} nativeButton={false}>
                Askıya Bırak
              </Button>
              <AddToListButton bookId={detail.id} signedIn={Boolean(userId)} />
              {userId && <ReportBookErrorButton bookId={detail.id} />}
            </div>

            {storeListings.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-medium">İkinci El Bulundu</p>
                <ul className="flex flex-col gap-1">
                  {storeListings.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/askida-kitap/${s.slug}`} className="text-primary hover:underline">
                        {s.title}
                      </Link>{" "}
                      <span className="text-muted-foreground">— @{s.ownerUsername}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="py-4">
        <Suspense fallback={null}>
          <AdSlot placement="book-page" contentLanguage={detail.lang} />
        </Suspense>
      </div>

      {(workEditions.sameLanguage.length > 0 || Object.keys(workEditions.otherLanguages).length > 0) && (
        <>
          <Separator />
          <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
              Diğer Baskılar
            </h2>
            {workEditions.sameLanguage.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-4">
                {workEditions.sameLanguage.map((e) => (
                  <Link key={e.id} href={`/kitap/${e.slug}`} className="flex w-24 flex-col gap-1">
                    <BookCover
                      title={e.name}
                      author=""
                      tone={toneForId(e.id)}
                      bookId={e.id}
                      hasImage={e.hasImage}
                      size="sm"
                      className="w-full"
                    />
                    <p className="truncate text-xs font-medium">{e.name}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{e.score.toFixed(1)}/10</p>
                  </Link>
                ))}
              </div>
            )}
            {Object.keys(workEditions.otherLanguages).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(workEditions.otherLanguages).map(([lang, editions]) => {
                  const t = TONE_STYLE[toneForId(lang.charCodeAt(0) + lang.charCodeAt(lang.length - 1))];
                  return (
                    <details key={lang} className="group">
                      <summary
                        className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-foreground/20 hover:bg-accent [&::-webkit-details-marker]:hidden"
                      >
                        <span
                          className="flex size-4 items-center justify-center rounded-full text-[0.55rem] font-semibold"
                          style={{ backgroundColor: t.bg, color: t.fg }}
                        >
                          {lang.slice(0, 1).toUpperCase()}
                        </span>
                        {lang.toUpperCase()} baskılar ({editions.length})
                      </summary>
                      <div className="mt-2 flex max-w-md flex-col gap-1 rounded-lg border border-border bg-card p-3">
                        {editions.map((e) => (
                          <Link
                            key={e.id}
                            href={`/kitap/${e.slug}`}
                            className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                          >
                            <span className="truncate text-primary hover:underline">{e.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{e.score.toFixed(1)}/10</span>
                          </Link>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {similarBooks.length > 0 && (
        <>
          <Separator />
          <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
              Benzer Kitaplar
            </h2>
            <div className="flex flex-wrap gap-4">
              {similarBooks.map((b) => (
                <Link
                  key={b.id}
                  href={`/kitap/${b.slug}`}
                  className="w-32 flex-shrink-0"
                >
                  <BookCover
                    title={b.name}
                    author={b.writers.join(", ") || "Yazar bilinmiyor"}
                    tone={toneForId(b.id)}
                    bookId={b.id}
                    hasImage={b.hasImage}
                    size="sm"
                    className="w-full"
                  />
                  <p className="mt-2 line-clamp-2 text-xs font-medium">{b.name}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {readers.length > 0 && (
        <>
          <Separator />
          <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
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
                  <EntityAvatar id={r.id} name={r.username} image={r.image} size="size-6" className="text-[10px]" />
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

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
          Yorumlar
        </h2>
        <EntityComments
          signedIn={Boolean(userId)}
          viewerId={userId ?? undefined}
          initialComments={comments}
          initialRepliesByComment={repliesByCommentObj}
          commentLikes={commentLikes}
          addCommentAction={addCommentAction.bind(null, detail.id, "comment")}
          addReplyAction={addReplyAction}
          shareCommentAction={shareCommentAction}
          placeholder="Bu kitap hakkında ne düşünüyorsunuz?"
        />
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
          Alıntılar
        </h2>
        <EntityComments
          signedIn={Boolean(userId)}
          viewerId={userId ?? undefined}
          initialComments={quotes}
          initialRepliesByComment={repliesByQuoteObj}
          commentLikes={quoteLikes}
          addCommentAction={addCommentAction.bind(null, detail.id, "quotation")}
          addReplyAction={addReplyAction}
          shareCommentAction={shareCommentAction}
          placeholder="Bu kitaptan bir alıntı paylaşın…"
          submitLabel="Alıntı Yap"
          emptyMessage="Henüz alıntı yok."
          quoteCardSource={detail.name}
        />
      </section>
    </>
  );
}
