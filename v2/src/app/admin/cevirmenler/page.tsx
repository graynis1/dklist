import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getTranslatorAdminList } from "@/db/queries/translator-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateTranslatorForm } from "@/components/dklist/create-translator-form";
import { TranslatorAdminRow } from "@/components/dklist/translator-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminTranslatorsPage({ searchParams }: PageProps<"/admin/cevirmenler">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminTranslatorsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminTranslatorsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/cevirmenler">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getTranslatorAdminList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Çevirmenler</h1>
        <p className="text-sm text-muted-foreground">
          Çevirmen kayıtlarını yönet - toplam {total} kayıt.
        </p>
      </div>

      <CreateTranslatorForm />

      <form action="/admin/cevirmenler" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Çevirmen isminde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan çevirmen yok." : "Henüz çevirmen yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((t) => (
            <TranslatorAdminRow key={t.id} translator={t} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/cevirmenler?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
