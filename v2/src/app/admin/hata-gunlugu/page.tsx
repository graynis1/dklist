import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getRecentErrors, getRecentErrorGroups } from "@/db/queries/error-log";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { formatRelativeTime } from "@/lib/utils";

// v1 had no equivalent - real customer ask (2026-09-08): "sisteme çok
// geniş kapsamlı bir error log da koy" (put a comprehensive error log into
// the system). Same real-consequence tier as the other admin log pages.
const ALLOWED = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminErrorLogPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-16" />}>
        <AdminErrorLogContent />
      </Suspense>
    </div>
  );
}

async function AdminErrorLogContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ALLOWED)) redirect("/");

  const [groups, recent] = await Promise.all([getRecentErrorGroups(24), getRecentErrors(100)]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <AdminPageHeader
        title="Hata Günlüğü"
        description="Sunucu ve tarayıcı tarafında yakalanan gerçek hatalar - son 24 saatte tekrarlanan hata gruplarına göre."
      />

      <div className="mb-8 rounded-lg border border-border p-4">
        <h2 className="mb-3 font-heading text-lg font-medium">Son 24 Saat - Gruplu Görünüm</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Son 24 saatte kayıtlı hata yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groups.map((g, i) => (
              <li key={`${g.digest}-${i}`} className="flex items-start justify-between gap-4 border-b border-border pb-2 text-sm last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.message}</p>
                  <p className="text-xs text-muted-foreground">
                    İlk: {formatRelativeTime(g.firstSeen)} · Son: {formatRelativeTime(g.lastSeen)}
                    {g.digest && <> · digest: {g.digest}</>}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  {g.count}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="mb-3 font-heading text-lg font-medium">Son 100 Ham Kayıt</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz kayıtlı hata yok.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((e) => (
              <li key={e.id} className="border-b border-border pb-3 text-sm last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">{e.source}</span>
                  {e.method && <span>{e.method}</span>}
                  {e.url && <span className="truncate">{e.url}</span>}
                  <span>{formatRelativeTime(e.createdDate)}</span>
                </div>
                <p className="mt-1 font-medium">{e.message}</p>
                {e.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Stack trace</summary>
                    <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-secondary p-2 text-xs whitespace-pre-wrap">{e.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
