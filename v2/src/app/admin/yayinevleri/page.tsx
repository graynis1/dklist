import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPublisherAdminList } from "@/db/queries/publisher-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreatePublisherForm } from "@/components/dklist/create-publisher-form";
import { PublisherAdminRow } from "@/components/dklist/publisher-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPublishersPage({ searchParams }: PageProps<"/admin/yayinevleri">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminPublishersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminPublishersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/yayinevleri">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getPublisherAdminList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Yayınevleri"
        description={`Yayınevi kayıtlarını yönet - toplam ${total} kayıt (tahmini).`}
      />

      <CreatePublisherForm />

      <form action="/admin/yayinevleri" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Yayınevi isminde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan yayınevi yok." : "Henüz yayınevi yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <PublisherAdminRow key={p.id} publisher={p} />
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/yayinevleri?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
