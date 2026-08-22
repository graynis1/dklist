import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getSupportTickets, FAQ_CATEGORIES } from "@/db/queries/support";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { SupportTicketStatusToggle } from "@/components/dklist/support-ticket-status-toggle";

const ALLOWED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminSupportTicketsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminSupportTicketsContent />
      </Suspense>
    </div>
  );
}

async function AdminSupportTicketsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED_ROLES)) redirect("/");

  const tickets = await getSupportTickets();
  const categoryLabels = new Map(FAQ_CATEGORIES.map((c) => [c.slug, c.label]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Destek Talepleri</h1>
        <p className="text-sm text-muted-foreground">
          /destek üzerinden gelen kullanıcı destek talepleri - {tickets.length} kayıt.
        </p>
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz bir talep yok.</p>
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
