import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Reklam Ver",
  description: "DKList'te reklam vermek için bize ulaşın.",
  path: "/reklam-ver",
});
import { connection } from "next/server";
import { UsersIcon, BookOpenIcon, PenLineIcon, EyeIcon, MousePointerClickIcon } from "lucide-react";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { AdInquiryForm } from "@/components/dklist/ad-inquiry-form";
import { AD_PLACEMENTS } from "@/lib/ad-placements";
import { getSiteStatsForAdvertisers } from "@/db/queries/ad-inquiry";

export default function AdvertiseWithUsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex flex-col gap-2">
          <SectionLabel>İşbirliği</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">DKList&apos;te Reklam Ver</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            DKList, kitapseverlerin okuma durumlarını takip ettiği, kitap keşfettiği ve
            yorumlarını paylaştığı bir topluluk. Yayınevi, kitapçı veya kitapla ilgili bir
            markaysanız, ilgili bir kitlenin karşısına çıkmak için bize ulaşın.
          </p>
        </div>

        <Suspense fallback={<div className="mb-10 h-24 animate-pulse rounded-lg bg-muted" />}>
          <StatsSection />
        </Suspense>

        <div className="mb-10">
          <h2 className="mb-4 font-heading text-xl font-medium">Nerede Görünür?</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Reklamınız, kitleye göre seçtiğiniz bir veya birden fazla alanda gösterilir - her
            biri sitenin en çok görüntülenen bölümlerinden.
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AD_PLACEMENTS.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-4 text-sm font-medium">
                {p.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-heading text-xl font-medium">İletişime Geçin</h2>
          <AdInquiryForm />
        </div>
      </div>
    </div>
  );
}

const STAT_ICONS = [UsersIcon, BookOpenIcon, PenLineIcon, EyeIcon, MousePointerClickIcon];

async function StatsSection() {
  await connection();
  const stats = await getSiteStatsForAdvertisers();

  const items = [
    { label: "Üye", value: stats.totalUsers },
    { label: "Kitap", value: stats.totalBooks },
    { label: "Yazar", value: stats.totalWriters },
    { label: "Gösterim", value: stats.totalImpressions },
    { label: "Tıklama", value: stats.totalClicks },
  ];

  return (
    <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {items.map((item, i) => {
        const Icon = STAT_ICONS[i];
        return (
          <div key={item.label} className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center">
            <Icon className="size-5 text-primary" />
            <div className="font-heading text-2xl font-medium">{item.value.toLocaleString("tr-TR")}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}
