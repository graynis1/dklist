import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getWriterAdminList } from "@/db/queries/writer-admin";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateWriterForm } from "@/components/dklist/create-writer-form";
import { WriterAdminRow } from "@/components/dklist/writer-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminWritersPage({ searchParams }: PageProps<"/admin/yazarlar">) {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminWritersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminWritersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/yazarlar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getWriterAdminList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader title="Yazarlar" description={`Yazar kayıtlarını yönet - toplam ${total} kayıt.`} />

      <CreateWriterForm />

      <form action="/admin/yazarlar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Yazar isminde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan yazar yok." : "Henüz yazar yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((w) => (
            <WriterAdminRow key={w.id} writer={w} />
          ))}
        </ul>
      )}

      <PaginationNav
        page={page}
        lastPage={lastPage}
        hrefForPage={(p) => `/admin/yazarlar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
      />
    </div>
  );
}
