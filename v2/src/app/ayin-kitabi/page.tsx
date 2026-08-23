import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { getCurrentBookOfMonth, getPastBooksOfMonth, isParticipating } from "@/db/queries/book-of-month";
import { ParticipateButton } from "@/components/dklist/participate-button";

export default function BookOfMonthPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Ayın Kitabı</h1>
          <p className="text-sm text-muted-foreground">
            Topluluğun birlikte okuduğu kitap - katıl, okuduktan sonra kitabın kendi sayfasındaki yorumlarda tartışmaya katıl.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <BookOfMonthContent />
        </Suspense>
      </div>
    </div>
  );
}

async function BookOfMonthContent() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const [current, past] = await Promise.all([getCurrentBookOfMonth(), getPastBooksOfMonth()]);
  const joined = current && userId ? await isParticipating(current.id, userId) : false;

  return (
    <div className="flex flex-col gap-10">
      {current ? (
        <div className="flex gap-6 rounded-lg border border-primary/30 bg-primary/5 p-6">
          <BookCover
            title={current.bookName}
            author={current.writers.join(", ") || "Yazar bilinmiyor"}
            tone={toneForId(current.bookId)}
            bookId={current.bookId}
            hasImage={current.hasImage}
            size="md"
            className="w-32 shrink-0"
          />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-xs font-medium text-primary">{current.periodLabel.toUpperCase()}</p>
            <Link href={`/kitap/${current.bookSlug}`} className="font-heading text-2xl font-medium hover:underline">
              {current.bookName}
            </Link>
            <p className="text-sm text-muted-foreground">{current.writers.join(", ") || "Yazar bilinmiyor"}</p>
            <p className="text-sm text-muted-foreground">{current.participantCount} kişi katılıyor</p>
            <div className="mt-2 flex gap-2">
              <ParticipateButton bookOfMonthId={current.id} initialJoined={joined} signedIn={Boolean(userId)} />
              <Link
                href={`/kitap/${current.bookSlug}`}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                Tartışmaya Katıl
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Şu anda belirlenmiş bir ayın kitabı yok.</p>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 font-heading text-xl font-medium">Geçmiş Seçimler</h2>
          <ul className="flex flex-col gap-3">
            {past.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{p.periodLabel}</p>
                  <Link href={`/kitap/${p.bookSlug}`} className="font-medium hover:underline">
                    {p.bookName}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground">{p.participantCount} katılımcı</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
