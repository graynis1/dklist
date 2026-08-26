import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/permission";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getAdminDashboardCounts } from "@/db/queries/admin-dashboard";
import { ADMIN_CATEGORIES } from "@/lib/admin-nav";

export default function AdminIndexPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-16" />}>
        <AdminIndexContent />
      </Suspense>
    </div>
  );
}

async function AdminIndexContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");

  const userType = session.user.userType;
  const visibleCategories = ADMIN_CATEGORIES.map((cat) => ({
    ...cat,
    tools: cat.tools.filter((tool) => hasRole(userType, tool.roles)),
  })).filter((cat) => cat.tools.length > 0);

  if (visibleCategories.length === 0) redirect("/");

  const counts = await getAdminDashboardCounts();
  const totalPending =
    counts.pendingBookSubmissions +
    counts.pendingBlogItems +
    counts.unresolvedNotices +
    counts.openAdInquiries +
    counts.openSupportTickets;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yönetim Paneli</h1>
        {totalPending > 0 ? (
          <p className="text-sm text-muted-foreground">
            Toplam <strong className="text-foreground">{totalPending}</strong> bekleyen iş var - aşağıdaki kırmızı sayılara bak.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Bekleyen iş yok, her şey güncel.</p>
        )}
      </div>

      <div className="flex flex-col gap-10">
        {visibleCategories.map((category) => (
          <div key={category.label}>
            <h2 className="mb-4 font-heading text-lg font-medium tracking-tight text-muted-foreground">
              {category.label}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {category.tools.map((tool) => {
                const count = tool.countKey ? counts[tool.countKey] : 0;
                return (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="flex h-full flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {tool.label}
                        {count > 0 && (
                          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                            {count}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground">{tool.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
