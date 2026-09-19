import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { getCartGroupedBySeller, storeImageUrl } from "@/db/queries/store";
import { CartRemoveButton } from "@/components/dklist/cart-remove-button";

export default function CartPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Askıda Kitap</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Sepetim</h1>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <CartContent />
        </Suspense>
      </div>
    </div>
  );
}

async function CartContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  const groups = await getCartGroupedBySeller(Number(session.user.id));

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sepetin boş.{" "}
        <Link href="/askida-kitap" className="underline hover:text-foreground">
          Askıda Kitap&apos;a göz at
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Her satıcının bir ödeme formu var - iyzico'nun tek bir alt üye
          hesabına (subMerchantKey) ödeme yapabilen checkout formu, farklı
          satıcıların ilanlarını tek ödemede birleştiremiyor. Bu yüzden
          sepet satıcıya göre gruplu, "tek tuşla öde" tüm sepet için değil
          her satıcı grubu için ayrı. */}
      {groups.map((group) => (
        <div key={group.sellerId} className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">@{group.sellerUsername}</span>
            <span className="text-sm text-muted-foreground">{group.itemsSubtotal.toFixed(2)} TL</span>
          </div>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {storeImageUrl(item.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={storeImageUrl(item.image)!} alt={item.title} className="size-full object-cover" />
                  ) : null}
                </div>
                <Link href={`/askida-kitap/${item.slug}`} className="flex-1 truncate text-sm underline hover:text-primary">
                  {item.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {item.price} TL{item.shippingFee ? ` + ${item.shippingFee} TL kargo` : ""}
                </span>
                <CartRemoveButton storeId={item.id} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Aynı satıcıdan birden fazla ürün birlikte kargolanır, kargo ücreti tek sefer alınır
            {group.shippingTotal > 0 && ` (${group.shippingTotal.toFixed(2)} TL)`}.
          </p>
          <Button render={<Link href={`/sepetim/odeme?sellerId=${group.sellerId}`} />} nativeButton={false} className="w-fit">
            Bu Satıcıdan Öde ({group.total.toFixed(2)} TL)
          </Button>
        </div>
      ))}
    </div>
  );
}
