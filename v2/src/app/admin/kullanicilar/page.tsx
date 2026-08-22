import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getUserAdminList } from "@/db/queries/user-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAdminRow } from "@/components/dklist/user-admin-row";

// v1's real getUserForAdmin() list is Mod("Kütüphaneci")+Admin gated; the
// mutating actions (role/disable/publisher change) stay Admin-only, checked
// separately in actions.ts, matching v1's own split exactly.
const LIST_ROLES = [USER_TYPES.Mod, USER_TYPES.Admin];

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/kullanicilar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminUsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminUsersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/kullanicilar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, LIST_ROLES)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getUserAdminList(page, 20, search);
  const canMutate = hasRole(session.user.userType, [USER_TYPES.Admin]);
  // hasRole(type, []) is only ever true for SuperAdmin - matches v1's real
  // deleteUserAdmin() gate (an empty allow-list) exactly.
  const canDelete = hasRole(session.user.userType, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Kullanıcılar"
        description={
          <>
            Kullanıcı rollerini ve hesap durumunu yönet - toplam {total} kayıt.
            {!canMutate && " (Sadece görüntüleme - değişiklik için Yönetici gerekir.)"}
          </>
        }
      />

      <form action="/admin/kullanicilar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Kullanıcı adında ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan kullanıcı yok." : "Henüz kullanıcı yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((u) => (
            <UserAdminRow key={u.id} user={u} canMutate={canMutate} canDelete={canDelete} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/kullanicilar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
