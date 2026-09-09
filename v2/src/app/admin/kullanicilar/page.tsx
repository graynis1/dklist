import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getUserAdminList, getDistinctUserCities, type UserAdminSortBy } from "@/db/queries/user-admin";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAdminRow } from "@/components/dklist/user-admin-row";
import { BulkMailDialog } from "@/components/dklist/bulk-mail-dialog";

const NATIVE_SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring";

// v1's real getUserForAdmin() list is Mod("Kütüphaneci")+Admin gated; the
// mutating actions (role/disable/publisher change) stay Admin-only, checked
// separately in actions.ts, matching v1's own split exactly.
const LIST_ROLES = [USER_TYPES.Mod, USER_TYPES.Admin];

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/kullanicilar">) {
  return (
    <div className="flex-1 bg-background">
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
  const sex = typeof params.sex === "string" ? params.sex : "";
  const city = typeof params.city === "string" ? params.city : "";
  const sortByParam = typeof params.sortBy === "string" ? params.sortBy : "id";
  const sortBy = (["id", "createdDate", "birthDate", "username"] as const).includes(sortByParam as UserAdminSortBy)
    ? (sortByParam as UserAdminSortBy)
    : "id";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";
  const filters = { sex: sex || undefined, livingCity: city || undefined };

  const [{ items, total, lastPage }, cities] = await Promise.all([
    getUserAdminList(page, 20, search, filters, sortBy, sortDir),
    getDistinctUserCities(),
  ]);
  const canMutate = hasRole(session.user.userType, [USER_TYPES.Admin]);
  // Was gated SuperAdmin-only (matching v1's deleteUserAdmin()) - fixed
  // 2026-09-08, see actions.ts's own comment on deleteUserAccountAction
  // for why that was unreachable by anyone in practice.
  const canDelete = canMutate;

  const qs = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = { search, sex, city, sortBy, sortDir, ...overrides };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Kullanıcılar"
        description={
          <>
            Kullanıcı rollerini ve hesap durumunu yönet - toplam {total} kayıt (demografik filtre/sıralama ve toplu mail dahil).
            {!canMutate && " (Sadece görüntüleme - değişiklik için Yönetici gerekir.)"}
          </>
        }
      />

      <form action="/admin/kullanicilar" className="mb-3 flex flex-wrap items-center gap-2">
        <Input name="search" defaultValue={search} placeholder="Kullanıcı adında ara..." className="w-48" />
        <select name="sex" defaultValue={sex} className={NATIVE_SELECT_CLASS}>
          <option value="">Cinsiyet (hepsi)</option>
          <option value="Erkek">Erkek</option>
          <option value="Kadın">Kadın</option>
        </select>
        <select name="city" defaultValue={city} className={NATIVE_SELECT_CLASS}>
          <option value="">Şehir (hepsi)</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="sortBy" defaultValue={sortBy} className={NATIVE_SELECT_CLASS}>
          <option value="id">Kayıt sırası</option>
          <option value="createdDate">Katılma tarihi</option>
          <option value="birthDate">Doğum tarihi</option>
          <option value="username">Kullanıcı adı</option>
        </select>
        <select name="sortDir" defaultValue={sortDir} className={NATIVE_SELECT_CLASS}>
          <option value="desc">Azalan</option>
          <option value="asc">Artan</option>
        </select>
        <Button type="submit" variant="outline">
          Filtrele
        </Button>
        {canMutate && <BulkMailDialog search={search} filters={filters} totalMatching={total} />}
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

      <PaginationNav page={page} lastPage={lastPage} hrefForPage={(p) => `/admin/kullanicilar${qs({ page: String(p) })}`} />
    </div>
  );
}
