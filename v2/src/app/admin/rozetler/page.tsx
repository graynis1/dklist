import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getBadgeList } from "@/db/queries/badge-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateBadgeForm } from "@/components/dklist/create-badge-form";
import { BadgeAdminRow } from "@/components/dklist/badge-admin-row";

// v1's real BadgeController gates add/update/delete to Admin only (no Mod).
const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminBadgesPage({ searchParams }: PageProps<"/admin/rozetler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminBadgesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminBadgesContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/rozetler">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getBadgeList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Rozetler</h1>
        <p className="text-sm text-muted-foreground">
          Rozet tanımlarını yönet - toplam {total} kayıt.
        </p>
      </div>

      <CreateBadgeForm />

      <form action="/admin/rozetler" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Rozet isminde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan rozet yok." : "Henüz rozet yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((badge) => (
            <BadgeAdminRow key={badge.id} badge={badge} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/rozetler?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
