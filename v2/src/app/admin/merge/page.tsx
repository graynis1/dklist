import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { mergeWorks, mergeWriters, mergeTranslators, mergePublishers, type MergeResult } from "@/db/queries/merge";
import { requireRole, hasRole, USER_TYPES } from "@/lib/permission";
import { logAdminAction } from "@/db/queries/admin-log";
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

// Customer's ask (2026-09-02): the same bulk-import duplication that
// motivated the book/work merge tool is just as real for writer/translator/
// publisher records - extended here rather than building four separate
// admin pages, since the shape (two IDs, reassign-then-delete, admin/mod
// only) is identical.
type EntityKind = "work" | "writer" | "translator" | "publisher";
const ENTITY_LABELS: Record<EntityKind, string> = {
  work: "Kitap (Work)",
  writer: "Yazar",
  translator: "Çevirmen",
  publisher: "Yayınevi",
};

function isEntityKind(value: string): value is EntityKind {
  return value in ENTITY_LABELS;
}

async function merge(formData: FormData) {
  "use server";
  let actor: { id: number };
  try {
    actor = await requireRole(MERGE_ALLOWED_ROLES);
  } catch (err) {
    redirect(`/admin/merge?error=${encodeURIComponent((err as Error).message)}`);
  }

  const kindRaw = String(formData.get("kind") ?? "work");
  const kind: EntityKind = isEntityKind(kindRaw) ? kindRaw : "work";
  const duplicateId = Number(formData.get("duplicateId"));
  const canonicalId = Number(formData.get("canonicalId"));

  const mergeFn = { work: mergeWorks, writer: mergeWriters, translator: mergeTranslators, publisher: mergePublishers }[kind];
  const result: MergeResult = await mergeFn(duplicateId, canonicalId);

  if (result.status) {
    await logAdminAction(actor.id, `${kind}:merge`, kind, canonicalId, `absorbed ${kind} ${duplicateId} (${result.reassignedBooks} kitap)`);
  }
  redirect(
    result.status
      ? `/admin/merge?ok=1&kind=${kind}&reassigned=${result.reassignedBooks}`
      : `/admin/merge?error=${encodeURIComponent(result.error)}`,
  );
}

export default function AdminMergePage({
  searchParams,
}: PageProps<"/admin/merge">) {
  return (
    <div className="flex-1 bg-background">
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

  const { ok, kind: okKind, reassigned, error } = await searchParams;
  const selectedKind: EntityKind = typeof okKind === "string" && isEntityKind(okKind) ? okKind : "work";

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader
        title="Mükerrer Kayıt Birleştir"
        description="Aynı gerçek kayda ait iki farklı kaydı birleştirir - mükerrer olana ait tüm ilişkili kayıtları (kitap, oy, beğeni, yorum) asıl kayda taşır, sonra mükerrer kaydı siler. Bu geri alınamaz."
      />

      {ok && (
        <p className="mb-6 rounded-md bg-secondary p-3 text-sm">
          {ENTITY_LABELS[selectedKind]} birleştirildi - {reassigned} kitap asıl kayda taşındı.
        </p>
      )}
      {error && (
        <p className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ID&apos;ler</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={merge} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              Kayıt türü
              <select name="kind" defaultValue="work" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring">
                {(Object.keys(ENTITY_LABELS) as EntityKind[]).map((k) => (
                  <option key={k} value={k}>
                    {ENTITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Mükerrer (silinecek) ID
              <Input name="duplicateId" type="number" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Asıl (korunacak) ID
              <Input name="canonicalId" type="number" required />
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
