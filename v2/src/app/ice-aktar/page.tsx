import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { GoodreadsImportForm } from "@/components/dklist/goodreads-import-form";

export default function ImportPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <ImportContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ImportContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/giris");

  return (
    <>
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Kitaplığım</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Goodreads&apos;ten İçe Aktar</h1>
      </div>
      <GoodreadsImportForm />
    </>
  );
}
