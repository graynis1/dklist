import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getRecentAdminActions, getAdminActionCountsByPerson } from "@/db/queries/admin-log";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";

const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminActivityLogPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminActivityLogContent />
      </Suspense>
    </div>
  );
}

async function AdminActivityLogContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED)) redirect("/");

  const [actions, counts] = await Promise.all([
    getRecentAdminActions(200),
    getAdminActionCountsByPerson(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Aktivite Günlüğü</h1>
        <p className="text-sm text-muted-foreground">
          Mod/Kütüphaneci/Admin yetkisiyle yapılan tüm işlemlerin denetim kaydı.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-border p-4">
        <h2 className="mb-3 font-heading text-lg font-medium">Kişi Başına İşlem Sayısı</h2>
        {counts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz kayıtlı işlem yok.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {counts.map((c) => (
              <li key={c.actorUserId} className="flex items-center justify-between text-sm">
                <span>{c.actorName}</span>
                <span className="font-medium">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-heading text-lg font-medium">Son İşlemler</h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz kayıtlı işlem yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((a) => (
              <li key={a.id} className="border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.actorName}</span>
                  <span className="text-xs text-muted-foreground">{a.createdAt}</span>
                </div>
                <div className="text-muted-foreground">
                  {a.action}
                  {a.targetType && a.targetId != null ? ` · ${a.targetType}:${a.targetId}` : ""}
                  {a.detail ? ` · ${a.detail}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
