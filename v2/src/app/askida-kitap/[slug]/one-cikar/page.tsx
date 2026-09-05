import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getStoreBySlug } from "@/db/queries/store";
import { getStorePinSettings, isStorePinned } from "@/db/queries/store-pin";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { purchaseStorePinAction } from "./actions";

/**
 * Real customer report (2026-09-05, Askıda Kitap section): "üste tutturma
 * renkli çerçeve vs gibi özellikler satın alma kısmı olabilir mi?
 * sahibinden.com da olduğu gibi." Same checkout shape as /premium, scoped
 * to one listing the buyer owns.
 */
export default function StorePinPage({ params, searchParams }: PageProps<"/askida-kitap/[slug]/one-cikar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <StorePinContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StorePinContent({
  params,
  searchParams,
}: {
  params: PageProps<"/askida-kitap/[slug]/one-cikar">["params"];
  searchParams: PageProps<"/askida-kitap/[slug]/one-cikar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { slug } = await params;
  const item = await getStoreBySlug(slug);
  if (!item) notFound();
  if (item.ownerId !== Number(session.user.id)) redirect(`/askida-kitap/${slug}`);

  const { error } = await searchParams;
  const [settings, alreadyPinned] = await Promise.all([getStorePinSettings(), isStorePinned(item.id)]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Öne Çıkar</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">{item.title}</h1>
      </div>

      {alreadyPinned ? (
        <div className="rounded-lg border border-border p-6">
          <p className="font-medium text-emerald-700">Bu ilan şu anda öne çıkarılmış durumda.</p>
        </div>
      ) : !settings.active ? (
        <p className="text-sm text-muted-foreground">İlan öne çıkarma şu anda satışa kapalı.</p>
      ) : (
        <div className="flex flex-col gap-4 rounded-lg border border-border p-6">
          <p className="text-lg">
            <span className="font-medium">{(settings.priceKurus / 100).toFixed(2)} TL</span> karşılığında ilanınız
            {" "}{settings.durationDays} gün boyunca listede en üstte, renkli bir çerçeveyle öne çıkar.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form action={purchaseStorePinAction.bind(null, item.id, slug)}>
            <Button type="submit" className="w-fit">
              Satın Al
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
