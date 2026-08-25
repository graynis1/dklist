import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";
import { auth } from "@/auth";
import { hasRole, DATA_ENTRY_ROLES } from "@/lib/permission";
import {
  createBookSubmissionAction,
  searchPublishersAction,
  searchWritersAction,
  searchTranslatorsAction,
  searchCategoriesAction,
  searchParentBooksAction,
} from "./actions";

export default function NewBookPage({ searchParams }: PageProps<"/kitap/yeni">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <NewBookContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NewBookContent({
  searchParams,
}: {
  searchParams: PageProps<"/kitap/yeni">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }
  if (!hasRole(session.user.userType, DATA_ENTRY_ROLES)) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Kitap eklemek için yazar, yayınevi veya kütüphaneci üyeliği gerekiyor.
        </CardContent>
      </Card>
    );
  }

  const { error, created, approved, slug } = await searchParams;

  if (created === "1") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Kitap Gönderildi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {approved === "1" ? (
            <>
              <p>Kitabınız eklendi ve yayında.</p>
              <Link href={`/kitap/${slug}`} className="text-primary underline">
                Kitabı görüntüle →
              </Link>
            </>
          ) : (
            <p>Kitabınız alındı, bir kütüphaneci/yönetici onayından sonra yayına girecek.</p>
          )}
          <Link href="/kitap/yeni" className="text-muted-foreground underline">
            Yeni bir kitap daha ekle
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Yeni Kitap Ekle</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createBookSubmissionAction} className="flex flex-col gap-4">
          <Input name="name" placeholder="Kitap adı" required />
          <Input name="orgName" placeholder="Orijinal ad" required />
          <EntitySearchPicker
            name="publisherId"
            label="Yayınevi"
            placeholder="Yayınevi ara..."
            searchAction={searchPublishersAction}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input name="lang" placeholder="Dil (örn. tr)" required />
            <Input name="pageNumber" type="number" min={1} placeholder="Sayfa sayısı" required />
          </div>
          <Input name="format" placeholder="Format (opsiyonel)" />
          <Input name="isbn" placeholder="ISBN (opsiyonel)" />
          <textarea
            name="content"
            placeholder="Kitap hakkında bilgi (opsiyonel)"
            rows={4}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />

          <EntitySearchPicker
            name="parentId"
            label="Bu, mevcut bir kitabın yeni baskısı/çevirisi mi? (opsiyonel)"
            placeholder="Orijinal kitabı ara..."
            searchAction={searchParentBooksAction}
          />
          <EntitySearchPicker
            name="writerIds"
            label="Yazar(lar)"
            placeholder="Yazar ara..."
            multi
            searchAction={searchWritersAction}
          />
          <EntitySearchPicker
            name="translatorIds"
            label="Çevirmen(ler) (opsiyonel)"
            placeholder="Çevirmen ara..."
            multi
            searchAction={searchTranslatorsAction}
          />
          <p className="text-xs text-muted-foreground">
            Kategori, yeni baskı/çeviri olarak eklerseniz orijinal kitaptan otomatik alınır.
          </p>
          <EntitySearchPicker
            name="categoryIds"
            label="Kategori(ler) (yeni bir eser ekliyorsanız)"
            placeholder="Kategori ara..."
            multi
            searchAction={searchCategoriesAction}
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-fit">
            Kitabı Gönder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
