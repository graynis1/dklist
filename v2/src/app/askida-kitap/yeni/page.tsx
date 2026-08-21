import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { createStoreAction } from "../actions";
import { BookLinkPicker } from "@/components/dklist/book-link-picker";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { PaidListingFields } from "@/components/dklist/paid-listing-fields";

export default function NewStorePage({ searchParams }: PageProps<"/askida-kitap/yeni">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <NewStoreContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NewStoreContent({
  searchParams,
}: {
  searchParams: PageProps<"/askida-kitap/yeni">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }
  const { error } = await searchParams;
  const marketplace = await getMarketplaceStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Askıda Kitap İlanı Ver</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createStoreAction} className="flex flex-col gap-4">
          <Input name="title" placeholder="İlan başlığı" required />
          <textarea
            name="content"
            placeholder="Kitap hakkında bilgi (durumu, baskısı vb.)"
            required
            rows={4}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />
          <Input name="location" placeholder="Konum (şehir)" />
          <Input name="shipment" placeholder="Kargo bilgisi" />
          <BookLinkPicker />
          {marketplace.active && <PaidListingFields />}
          <div className="flex flex-col gap-1">
            <label htmlFor="images" className="text-sm text-muted-foreground">
              Fotoğraflar (gerçek kopyanın fotoğrafı, en az 1)
            </label>
            <input
              id="images"
              name="images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              required
              className="text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-fit">
            İlanı Yayınla
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
