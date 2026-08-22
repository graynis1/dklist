import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mergeWorks } from "@/db/queries/merge";
import { requireRole, hasRole, USER_TYPES } from "@/lib/permission";
import { logAdminAction } from "@/db/queries/admin-log";
import { SiteHeader } from "@/components/dklist/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";

// First real Phase 4 permission check - previously gated on "is signed in"
// only, not any actual role, and (worse) the Server Action itself had no
// check at all: Server Actions are their own reachable endpoint independent
// of how the referencing page renders, so page-only gating never actually
// protected the mutation. Both the page and the action now go through
// requireRole(), matching v1's Admin-only gate on its destructive data-merge
// endpoints (e.g. WriterController::delete).
const MERGE_ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

async function merge(formData: FormData) {
  "use server";
  let actor: { id: number };
  try {
    actor = await requireRole(MERGE_ALLOWED_ROLES);
  } catch (err) {
    redirect(`/admin/merge?error=${encodeURIComponent((err as Error).message)}`);
  }

  const duplicateId = Number(formData.get("duplicateWorkId"));
  const canonicalId = Number(formData.get("canonicalWorkId"));
  const result = await mergeWorks(duplicateId, canonicalId);
  if (result.status) {
    await logAdminAction(actor.id, "work:merge", "work", canonicalId, `absorbed work ${duplicateId} (${result.reassignedBooks} books)`);
  }
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
  if (!hasRole(session.user.userType, MERGE_ALLOWED_ROLES)) {
    redirect("/");
  }

  const { ok, reassigned, error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader
        title="Mükerrer Kayıt Birleştir"
        description="Aynı esere ait iki farklı work kaydını birleştirir - mükerrer olan tüm kitapları asıl kayda taşır, sonra mükerrer kaydı siler. Bu geri alınamaz."
      />

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
