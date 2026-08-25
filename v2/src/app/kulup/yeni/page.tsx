import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth } from "@/auth";
import { createBookClubAction, searchBooksForClubAction } from "./actions";
import { EntitySearchPicker } from "@/components/dklist/entity-search-picker";

export default function NewBookClubPage({ searchParams }: PageProps<"/kulup/yeni">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <NewBookClubContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function NewBookClubContent({
  searchParams,
}: {
  searchParams: PageProps<"/kulup/yeni">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/giris");
  }
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Kitap Kulübü Kur</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createBookClubAction} className="flex flex-col gap-4">
          <Input name="name" placeholder="Kulüp adı" required minLength={3} />
          <textarea
            name="description"
            placeholder="Kulübünüz ne hakkında? Kimler katılabilir, ne sıklıkla okuyorsunuz?"
            required
            rows={4}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-ring"
          />
          <EntitySearchPicker
            name="currentBookId"
            label="Şu an okunan kitap (opsiyonel, sonra da eklenebilir)"
            placeholder="Kitap ara..."
            searchAction={searchBooksForClubAction}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Görünürlük</label>
            <Select
              name="visibility"
              defaultValue="public"
              items={[
                { value: "public", label: "Herkese açık - /kulupler listesinde görünür" },
                { value: "private", label: "Özel - sadece bağlantıyı bilenler bulabilir" },
              ]}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Herkese açık - /kulupler listesinde görünür</SelectItem>
                <SelectItem value="private">Özel - sadece bağlantıyı bilenler bulabilir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-fit">
            Kulübü Kur
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
