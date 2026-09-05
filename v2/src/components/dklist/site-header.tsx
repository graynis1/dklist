import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { HeaderSearchBox } from "@/components/dklist/header-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/dklist/auth-status";
import { NotificationBell } from "@/components/dklist/notification-bell";
import { MessageBell } from "@/components/dklist/message-bell";
import { AdminNavLink } from "@/components/dklist/admin-nav-link";
import { CommunityMenu } from "@/components/dklist/community-menu";
import { MobileNavDrawer } from "@/components/dklist/mobile-nav-drawer";

// Kept short and deliberately guest-first: these are the four sections a
// first-time, signed-out visitor is actually here for. Everything else
// (points/badges/clubs/marketplace/etc.) lives behind the "Topluluk"
// dropdown (see CommunityMenu) - the previous version listed all 15 links
// inline with no wrapping, which both overflowed the viewport at ordinary
// desktop widths and buried these four essentials in engagement-feature
// clutter that only matters once someone's already a member.
// "Akış" promoted to top-level (2026-09-02, customer report: felt buried
// inside the "Topluluk" dropdown even though it's meant to be the site's
// live, "canlı akan" community pulse - a first-time visitor would never
// find it there). Kept right after "Keşfet" rather than first: an
// anonymous visitor still needs a discovery entry point before a social
// feed means anything to them, but it's no longer three clicks deep.
const NAV = [
  { href: "/ara", label: "Keşfet" },
  { href: "/akis", label: "Akış" },
  { href: "/kitaplar", label: "Kitaplar" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/yayinevleri", label: "Yayınevleri" },
];

/**
 * Taller (h-20, was h-16), heavier logo, larger nav type and icon buttons -
 * maintainer's direct complaint: "header da genel olarak çok kötü... bu
 * büyüklükteki bir sisteme yakışan bir şey değil." The old header read as
 * a small-app default; every element here (logo weight, nav tracking, the
 * search field's own icon, the icon-button sizes matching the bumped
 * NotificationBell/MessageBell/ThemeToggle) is deliberately a size class up
 * from before, and the container now stretches to max-w-[100rem] instead of
 * 7xl so the header's content band actually reaches the same edges the
 * wide-viewport page content now does.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[100rem] items-center gap-8 px-4 sm:px-8">
        <MobileNavDrawer />

        <Link
          href="/"
          className="font-heading text-2xl font-semibold tracking-tight italic"
        >
          DKList
        </Link>

        <nav className="hidden items-center gap-7 text-[0.95rem] font-medium text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <CommunityMenu />
          <AdminNavLink />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <HeaderSearchBox />
          {/* Real member report: "mobil tarafında ekranda arama kısmı
              görünmüyor" - HeaderSearchBox is `hidden lg:block` with no
              mobile equivalent at all below that, and "Keşfet" is buried
              one level deep in the mobile drawer, not visible in the
              header itself. A plain icon button matching every other
              mobile-visible header action here. */}
          <Link
            href="/ara"
            className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Ara"
          >
            <SearchIcon className="size-5" />
          </Link>
          <MessageBell />
          <NotificationBell />
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
