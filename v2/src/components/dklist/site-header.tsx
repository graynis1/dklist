import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/dklist/auth-status";
import { NotificationBell } from "@/components/dklist/notification-bell";
import { MessageBell } from "@/components/dklist/message-bell";

// "Yazarlar"/"Askıda Kitap" stay dead links deliberately - each needs a page
// that doesn't exist yet (a writers-index/browse page for the first, a
// Phase 3 marketplace feature for the second), not a wrong destination.
const NAV = [
  { href: "/ara", label: "Keşfet" },
  { href: "#", label: "Yazarlar" },
  { href: "#", label: "Askıda Kitap" },
  { href: "/bloglar", label: "Bloglar" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
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
        </nav>

        <div className="ml-auto flex items-center gap-3">
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
