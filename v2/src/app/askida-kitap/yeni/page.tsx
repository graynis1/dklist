import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { getMarketplaceStatus } from "@/db/queries/marketplace-settings";
import { CreateStoreForm } from "@/components/dklist/create-store-form";
import { getBookLinkInfoAction } from "@/app/askida-kitap/actions";

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
  const { bookId } = await searchParams;
  const marketplace = await getMarketplaceStatus();
  // Real gap found via customer report: coming here from a book page's
  // "Askıya Ekle" button carried no context at all - re-search the exact
  // same book from scratch. Pre-fills BookLinkPicker when a real bookId
  // is present.
  const parsedBookId = typeof bookId === "string" ? Number(bookId) : NaN;
  const initialBook = Number.isInteger(parsedBookId) ? await getBookLinkInfoAction(parsedBookId) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Askıda Kitap İlanı Ver</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateStoreForm marketplaceActive={marketplace.active} initialBook={initialBook} />
      </CardContent>
    </Card>
  );
}
