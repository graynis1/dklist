import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SiteHeader } from "@/components/dklist/site-header";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating } from "@/components/dklist/star-rating";
import { getBookBySlug } from "@/db/queries/book-detail";

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

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StarRating value={detail.score} />
              <span className="font-medium">{detail.score.toFixed(2)}</span>
              <span className="text-muted-foreground">
                · {detail.viewCount.toLocaleString("tr-TR")} görüntülenme
              </span>
              {detail.pageNumber > 0 && (
                <span className="text-muted-foreground">
                  · {detail.pageNumber} sayfa
                </span>
              )}
            </div>

            {detail.publisher && (
              <p className="text-sm text-muted-foreground">
                Yayınevi: <span className="text-foreground">{detail.publisher.name}</span>
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button>Kitaplığıma Ekle</Button>
              <Button variant="outline">Askıya Bırak</Button>
              <Button variant="ghost">Şikayet Et</Button>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <h2 className="font-heading mb-6 text-2xl font-medium tracking-tight">
          Yorumlar
        </h2>
        <p className="text-muted-foreground">
          Henüz yorum yok — bu kitabı ilk değerlendiren sen ol.
        </p>
      </section>
    </>
  );
}
