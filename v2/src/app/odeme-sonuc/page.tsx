import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";

const STATUS_CONTENT: Record<string, { title: string; description: string; tone: string }> = {
  success: { title: "Ödemeniz Alındı", description: "Siparişiniz oluşturuldu, satıcı en kısa sürede kargoya verecek. Sipariş detaylarını Siparişlerim sayfasından takip edebilirsiniz.", tone: "text-emerald-700" },
  failed: { title: "Ödeme Başarısız", description: "Ödemeniz tamamlanamadı, kartınızdan herhangi bir ücret çekilmedi. Tekrar denemek isterseniz ilana geri dönebilirsiniz.", tone: "text-destructive" },
  pending: { title: "Ödeme İşleniyor", description: "Ödemeniz işleme alındı, sonucu birazdan Siparişlerim sayfasında görebilirsiniz.", tone: "text-amber-700" },
  error: { title: "Bir Hata Oluştu", description: "Ödeme durumunuzu doğrularken bir sorun oluştu. Lütfen Siparişlerim sayfasından kontrol edin ya da destek ile iletişime geçin.", tone: "text-destructive" },
};

export default function PaymentResultPage({ searchParams }: PageProps<"/odeme-sonuc">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-24" />}>
        <PaymentResultContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PaymentResultContent({ searchParams }: { searchParams: PageProps<"/odeme-sonuc">["searchParams"] }) {
  const { status } = await searchParams;
  const key = typeof status === "string" && STATUS_CONTENT[status] ? status : "error";
  const content = STATUS_CONTENT[key];

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <SectionLabel>Ödeme Sonucu</SectionLabel>
      <h1 className={`mt-2 font-heading text-3xl font-medium tracking-tight ${content.tone}`}>{content.title}</h1>
      <p className="mt-4 text-muted-foreground">{content.description}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button render={<Link href="/siparislerim" />} nativeButton={false}>Siparişlerim</Button>
        <Button variant="outline" render={<Link href="/askida-kitap" />} nativeButton={false}>
          Askıda Kitap
        </Button>
      </div>
    </div>
  );
}
