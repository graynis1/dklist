import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { auth } from "@/auth";
import { getMyStores } from "@/db/queries/store";

const STATUS_LABELS: Record<string, string> = {
  active: "Mevcut",
  completed: "Verildi",
  cancelled: "İptal Edildi",
};

export default function MyStoresPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Hesabım</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">İlanlarım</h1>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <MyStoresList />
        </Suspense>
      </div>
    </div>
  );
}

async function MyStoresList() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }

  const stores = await getMyStores(Number(session.user.id));

  if (stores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Henüz bir ilanın yok.{" "}
        <Link href="/askida-kitap/yeni" className="underline hover:text-foreground">
          İlan ver
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {stores.map((s) => (
        <li key={s.id}>
          <Link
            href={`/askida-kitap/${s.slug}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-accent"
          >
            <span className="font-medium">{s.title}</span>
            <span className="text-sm text-muted-foreground">{STATUS_LABELS[s.status] ?? s.status}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
