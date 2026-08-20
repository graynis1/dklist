import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mergeWorks } from "@/db/queries/merge";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLabel } from "@/components/dklist/star-rating";

// Minimal manual-merge tool per PLAN.md's Phase 1 - gated on "is signed in"
// only for now, NOT a real role check. Phase 4 builds the actual admin role
// hierarchy (Kurucu/Admin/Kütüphaneci/Moderatör); this page must be revisited
// then to gate on the real role instead of just a session existing.
async function merge(formData: FormData) {
  "use server";
  const duplicateId = Number(formData.get("duplicateWorkId"));
  const canonicalId = Number(formData.get("canonicalWorkId"));
  const result = await mergeWorks(duplicateId, canonicalId);
  redirect(
    result.status
      ? `/admin/merge?ok=1&reassigned=${result.reassignedBooks}`
      : `/admin/merge?error=${encodeURIComponent(result.error)}`,
  );
}

export default function AdminMergePage({
  searchParams,
}: PageProps<"/admin/merge">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminMergeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminMergeContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/merge">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }

  const { ok, reassigned, error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">
          Mükerrer Kayıt Birleştir
        </h1>
        <p className="text-sm text-muted-foreground">
          Aynı esere ait iki farklı work kaydını birleştirir - mükerrer
          olan tüm kitapları asıl kayda taşır, sonra mükerrer kaydı siler.
          Bu geri alınamaz.
        </p>
      </div>

      {ok && (
        <p className="mb-6 rounded-md bg-secondary p-3 text-sm">
          Birleştirildi - {reassigned} kitap asıl kayda taşındı.
        </p>
      )}
      {error && (
        <p className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work ID&apos;leri</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={merge} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Mükerrer (silinecek) work ID
              <Input name="duplicateWorkId" type="number" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Asıl (korunacak) work ID
              <Input name="canonicalWorkId" type="number" required />
            </label>
            <Button type="submit" variant="destructive">
              Birleştir
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
