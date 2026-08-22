import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getNewsletterSubscribers } from "@/db/queries/newsletter";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { NewsletterSubscriberActions } from "@/components/dklist/newsletter-subscriber-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// v1's NewsletterController::delete() gates Admin only (not Mod), unlike the
// notice queue - matched here rather than reusing the notice queue's role set.
const BULTEN_ALLOWED_ROLES = [USER_TYPES.Admin];

export default function AdminNewsletterPage({
  searchParams,
}: PageProps<"/admin/bulten">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <AdminNewsletterContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminNewsletterContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/bulten">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }
  if (!hasRole(session.user.userType, BULTEN_ALLOWED_ROLES)) {
    redirect("/");
  }

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";
  const { items, total, lastPage } = await getNewsletterSubscribers(page, 100, search);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <AdminPageHeader title="Bülten Aboneleri" description={`Toplam ${total} kayıt.`} />

      <form action="/admin/bulten" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Mail adresinde ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan abone yok." : "Henüz abone yok."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>{s.mail}</span>
              <NewsletterSubscriberActions id={s.id} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/bulten?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
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
