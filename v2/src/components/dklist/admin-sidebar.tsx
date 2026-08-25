import Link from "next/link";
import { ArrowLeftIcon, ShieldIcon } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserType } from "@/lib/roles";
import { AdminSidebarNav } from "@/components/dklist/admin-sidebar-nav";
import type { AdminCategory } from "@/lib/admin-nav";
import type { AdminDashboardCounts } from "@/db/queries/admin-dashboard";

/**
 * The admin panel's own shell chrome - deliberately nothing like SiteHeader
 * (no search box, no public nav, no theme toggle, no "Üye Ol"). Forced dark
 * regardless of the site's own light/dark setting (`className="dark"` scopes
 * the CSS custom properties to this subtree only, see globals.css's
 * `.dark { ... }` block) - a real admin control-room look, immediately
 * distinguishable from the public marketing site rather than the previous
 * "SiteHeader + a content list" pages that read as just more public pages.
 */
export function AdminSidebar({
  categories,
  counts,
  username,
  userType,
}: {
  categories: AdminCategory[];
  counts: AdminDashboardCounts;
  username: string;
  userType: UserType;
}) {
  return (
    <div className="dark flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
        <ShieldIcon className="size-5 text-sidebar-primary" />
        <div className="flex flex-col leading-tight">
          <span className="font-heading text-base font-medium">DKList</span>
          <span className="text-[0.7rem] text-sidebar-foreground/55">Yönetim Paneli</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AdminSidebarNav categories={categories} counts={counts} />
      </div>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/"
          className="mb-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Siteye Dön
        </Link>
        <div className="flex items-center justify-between gap-2 rounded-md bg-sidebar-accent/40 px-2 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{username}</span>
            <span className="text-[0.7rem] text-sidebar-foreground/55">{ROLE_LABELS[userType]}</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="ghost" size="sm" type="submit" className="h-7 shrink-0 px-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              Çıkış
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
