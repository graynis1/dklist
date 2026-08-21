import { Suspense } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getPublicLists } from "@/db/queries/reading-lists";

export default function ListsBrowsePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>Listeler</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Keşfet</h1>
          <p className="text-sm text-muted-foreground">
            Topluluğun kürasyonunu yaptığı kitap listeleri.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <ListsBrowseContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ListsBrowseContent() {
  const lists = await getPublicLists();

  if (lists.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz herkese açık bir liste yok.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {lists.map((l) => (
        <li key={l.id} className="rounded-lg border border-border p-4">
          <Link href={`/liste/${l.slug}`} className="font-medium hover:underline">
            {l.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{l.ownerUsername} · {l.bookCount} kitap
            {l.description && ` · ${l.description}`}
          </p>
        </li>
      ))}
    </ul>
  );
}
