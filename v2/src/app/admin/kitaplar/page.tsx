import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getBookAdminList } from "@/db/queries/book-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookAdminDeleteButton } from "@/components/dklist/book-admin-delete-button";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminBooksPage({ searchParams }: PageProps<"/admin/kitaplar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminBooksContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminBooksContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/kitaplar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getBookAdminList(page, 20, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Kitaplar"
        description={`Kitap kayıtlarını yönet - toplam ${total} kayıt (tahmini).`}
      />

      <form action="/admin/kitaplar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Kitap adında ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan kitap yok." : "Henüz kitap yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-4">
              <div className="flex-1">
                <p className="font-medium">
                  {b.name}
                  {!b.approve && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Onay bekliyor</span>}
                </p>
                <p className="text-xs text-muted-foreground">{b.orgName} · {b.publisherName} · {b.lang}</p>
              </div>
              <Link href={`/admin/kitaplar/${b.id}`}>
                <Button variant="outline" size="sm">Düzenle</Button>
              </Link>
              <BookAdminDeleteButton bookId={b.id} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/kitaplar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
