import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { StarRating } from "@/components/dklist/star-rating";
import { getListBySlug } from "@/db/queries/reading-lists";
import { RemoveFromListButton } from "@/components/dklist/remove-from-list-button";
import { ListManageDetails } from "@/components/dklist/list-manage-details";
import { pageMetadata, truncateDescription } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/liste/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) return {};

  return pageMetadata({
    title: `${list.title} - @${list.ownerUsername}`,
    description: truncateDescription(list.description || `@${list.ownerUsername}'in "${list.title}" okuma listesi DKList'te.`),
    path: `/liste/${list.slug}`,
    noIndex: !list.isPublic,
  });
}

export default function ListDetailPage({ params }: PageProps<"/liste/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<ListSkeleton />}>
        <ListDetailContent params={params} />
      </Suspense>
    </div>
  );
}

function ListSkeleton() {
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

async function ListDetailContent({
  params,
}: {
  params: PageProps<"/liste/[slug]">["params"];
}) {
  const { slug } = await params;
  const list = await getListBySlug(slug);
  if (!list) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwner = viewerId === list.ownerId;

  if (!list.isPublic && !isOwner) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Liste</SectionLabel>
        <h1 className="font-heading text-4xl font-medium tracking-tight">{list.title}</h1>
        {list.description && <p className="max-w-2xl text-muted-foreground">{list.description}</p>}
        <p className="text-sm text-muted-foreground">
          <Link href={`/profil/${list.ownerUsername}`} className="hover:underline">
            @{list.ownerUsername}
          </Link>{" "}
          · {list.books.length} kitap{!list.isPublic && " · Gizli"}
        </p>
        {isOwner && <ListManageDetails listId={list.id} title={list.title} description={list.description} isPublic={list.isPublic} />}
      </div>

      {list.books.length === 0 ? (
        <p className="text-muted-foreground">Bu listede henüz kitap yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-5">
          {list.books.map((b) => (
            <div key={b.id} className="flex flex-col gap-2">
              <Link href={`/kitap/${b.slug}`} className="flex flex-col gap-3">
                <BookCover
                  title={b.name}
                  author={b.writers.join(", ") || "Yazar bilinmiyor"}
                  tone={toneForId(b.id)}
                  bookId={b.id}
                  hasImage={b.hasImage}
                  size="md"
                  className="w-full"
                />
                <div className="flex flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.writers.join(", ") || "Yazar bilinmiyor"}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    <StarRating value={b.score} />
                    <span className="text-muted-foreground">{b.score.toFixed(1)}/10</span>
                  </div>
                </div>
              </Link>
              {isOwner && <RemoveFromListButton listId={list.id} bookId={b.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
