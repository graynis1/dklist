import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getUserLists } from "@/db/queries/reading-lists";
import { CreateListForm } from "@/components/dklist/create-list-form";
import { MyListRow } from "@/components/dklist/my-list-row";

export default function MyListsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Listeler</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Listelerim</h1>
          <p className="text-sm text-muted-foreground">
            Kendi kürasyonunu yaptığın kitap listelerini oluştur ve paylaş.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <MyListsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function MyListsContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const lists = await getUserLists(Number(session.user.id));

  return (
    <div className="flex flex-col gap-6">
      <CreateListForm />
      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz bir listen yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lists.map((l) => (
            <MyListRow key={l.id} list={l} />
          ))}
        </ul>
      )}
    </div>
  );
}
