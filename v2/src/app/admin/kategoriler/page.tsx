import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getCategoryList } from "@/db/queries/category-admin";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PaginationNav } from "@/components/dklist/pagination-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreateCategoryForm } from "@/components/dklist/create-category-form";
import { CategoryAdminRow } from "@/components/dklist/category-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminCategoriesPage({ searchParams }: PageProps<"/admin/kategoriler">) {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminCategoriesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminCategoriesContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/kategoriler">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getCategoryList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader title="Kategoriler" description={`Kategori tanımlarını yönet - toplam ${total} kayıt.`} />

      <CreateCategoryForm />

      <form action="/admin/kategoriler" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Kategori isminde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan kategori yok." : "Henüz kategori yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((cat) => (
            <CategoryAdminRow key={cat.id} category={cat} />
          ))}
        </ul>
      )}

      <PaginationNav
        page={page}
        lastPage={lastPage}
        hrefForPage={(p) => `/admin/kategoriler?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
      />
    </div>
  );
}
