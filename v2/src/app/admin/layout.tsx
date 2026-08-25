import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/permission";
import type { UserType } from "@/lib/roles";
import { ADMIN_CATEGORIES, ADMIN_PANEL_ROLES } from "@/lib/admin-nav";
import { getAdminDashboardCounts } from "@/db/queries/admin-dashboard";
import { AdminSidebar } from "@/components/dklist/admin-sidebar";
import { NOINDEX_METADATA } from "@/lib/seo";

// Applies noindex to every /admin/* page in one place (26+ routes) instead
// of repeating it per file - none of these have any search-engine value,
// and several (destek-talepleri, kullanicilar, siparisler) would leak
// account-specific data if a crawler ever reached them.
export const metadata: Metadata = NOINDEX_METADATA;

/**
 * A genuinely separate shell for the whole admin panel - replaces the old
 * `return children` no-op layout that left every admin page rendering the
 * public SiteHeader/Footer and reading as just another page of the site
 * (maintainer's explicit complaint: "aşırı kötü... tamamen ayrı bir sayfa
 * olarak yap"). One auth/role gate here instead of duplicated per-page
 * redirect logic - individual pages still call `requireRole()` in their
 * Server Actions (this only gates the page shell, matching the existing
 * split documented in permission.ts) and may still redirect further for a
 * stricter per-tool role than the panel-wide minimum below.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_PANEL_ROLES)) redirect("/");

  const counts = await getAdminDashboardCounts();
  const categories = ADMIN_CATEGORIES.map((category) => ({
    ...category,
    tools: category.tools.filter((tool) => hasRole(session.user.userType, tool.roles)),
  })).filter((category) => category.tools.length > 0);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        categories={categories}
        counts={counts}
        username={session.user.name ?? "?"}
        userType={(session.user.userType ?? "Üye") as UserType}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
