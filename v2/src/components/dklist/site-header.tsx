import Link from "next/link";
import { Input } from "@/components/ui/input";
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
const NAV = [
  { href: "/ara", label: "Keşfet" },
  { href: "/kitaplar", label: "Kitaplar" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/yayinevleri", label: "Yayınevleri" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <MobileNavDrawer />

        <Link
          href="/"
          className="font-heading text-xl font-semibold tracking-tight italic"
        >
          DKList
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
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
          <form action="/ara" className="hidden lg:block">
            <Input
              name="q"
              placeholder="Kitap ara…"
              className="w-56 bg-secondary/60"
            />
          </form>
          <MessageBell />
          <NotificationBell />
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
