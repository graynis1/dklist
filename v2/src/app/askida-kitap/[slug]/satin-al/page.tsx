import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getStoreBySlug } from "@/db/queries/store";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { SiteHeader } from "@/components/dklist/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCheckoutAction } from "./actions";

export default function CheckoutPage({ params, searchParams }: PageProps<"/askida-kitap/[slug]/satin-al">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <CheckoutContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function CheckoutContent({
  params,
  searchParams,
}: {
  params: PageProps<"/askida-kitap/[slug]/satin-al">["params"];
  searchParams: PageProps<"/askida-kitap/[slug]/satin-al">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { slug } = await params;
  const { error } = await searchParams;
  const item = await getStoreBySlug(slug);
  if (!item) notFound();

  const marketplace = await getMarketplaceStatus();
  if (!marketplace.active || item.listingType !== "paid" || !item.price) {
    redirect(`/askida-kitap/${slug}`);
  }
  if (item.ownerId === Number(session.user.id)) {
    redirect(`/askida-kitap/${slug}`);
  }

  const action = createCheckoutAction.bind(null, slug);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Teslimat Bilgileri</CardTitle>
        <p className="text-sm text-muted-foreground">
          {item.title} · {item.price} TL
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <Input name="shippingName" placeholder="Ad Soyad" required />
          <Input name="shippingPhone" placeholder="Telefon" required />
          <Input name="shippingAddress" placeholder="Adres" required />
          <div className="grid grid-cols-2 gap-3">
            <Input name="shippingCity" placeholder="Şehir" required />
            <Input name="shippingDistrict" placeholder="İlçe (opsiyonel)" />
          </div>
          <Input name="shippingZip" placeholder="Posta Kodu (opsiyonel)" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-fit">
            Ödemeye Geç
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
