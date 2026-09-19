import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCartGroupedBySeller } from "@/db/queries/store";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { SiteHeader } from "@/components/dklist/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCartCheckoutAction } from "./actions";

export default function CartCheckoutPage({ searchParams }: PageProps<"/sepetim/odeme">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <CartCheckoutContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function CartCheckoutContent({
  searchParams,
}: {
  searchParams: PageProps<"/sepetim/odeme">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const { sellerId: sellerIdRaw, error } = await searchParams;
  const sellerId = Number(sellerIdRaw);
  if (!Number.isInteger(sellerId) || sellerId <= 0) redirect("/sepetim");

  const marketplace = await getMarketplaceStatus();
  if (!marketplace.active) redirect("/sepetim");

  const groups = await getCartGroupedBySeller(Number(session.user.id));
  const group = groups.find((g) => g.sellerId === sellerId);
  if (!group) redirect("/sepetim");

  const action = createCartCheckoutAction.bind(null, sellerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Teslimat Bilgileri</CardTitle>
        <p className="text-sm text-muted-foreground">
          @{group.sellerUsername} · {group.items.length} ürün · {group.total.toFixed(2)} TL
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          {group.items.map((item) => (
            <li key={item.id}>
              {item.title} · {item.price} TL
            </li>
          ))}
          {group.shippingTotal > 0 && <li>Kargo · {group.shippingTotal.toFixed(2)} TL</li>}
        </ul>
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
          {typeof error === "string" && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-fit">
            Ödemeye Geç
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
