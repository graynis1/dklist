import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getSupportTickets, FAQ_CATEGORIES } from "@/db/queries/support";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { SupportTicketStatusToggle } from "@/components/dklist/support-ticket-status-toggle";

const ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

const STATUS_TABS: { value: "all" | "open" | "resolved"; label: string }[] = [
  { value: "open", label: "Açık" },
  { value: "resolved", label: "Çözüldü" },
  { value: "all", label: "Tümü" },
];

export default function AdminSupportTicketsPage({ searchParams }: PageProps<"/admin/destek-talepleri">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminSupportTicketsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminSupportTicketsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/destek-talepleri">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED_ROLES)) redirect("/");

  const params = await searchParams;
  const statusFilter = (["all", "open", "resolved"] as const).includes(params.status as never)
    ? (params.status as "all" | "open" | "resolved")
    : "open";

  const tickets = await getSupportTickets(statusFilter);
  const categoryLabels = new Map(FAQ_CATEGORIES.map((c) => [c.slug, c.label]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Destek Talepleri"
        description={`/destek üzerinden gelen kullanıcı destek talepleri - ${tickets.length} kayıt.`}
      />

      <div className="mb-6 flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/destek-talepleri?status=${tab.value}`}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              statusFilter === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {statusFilter === "all" ? "Henüz bir talep yok." : "Bu durumda bir talep yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {tickets.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t.createdAt}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {categoryLabels.get(t.category) ?? t.category}
                  </span>
                  {t.status === "resolved" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Çözüldü</span>
                  )}
                </div>
                <p>
                  {t.username ? <strong>@{t.username}</strong> : <span className="text-muted-foreground">Misafir</span>}
                  {" · "}
                  {t.email}
                </p>
                <p className="text-muted-foreground">{t.message}</p>
              </div>
              <SupportTicketStatusToggle id={t.id} status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
