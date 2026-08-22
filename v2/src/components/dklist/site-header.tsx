import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/dklist/auth-status";
import { NotificationBell } from "@/components/dklist/notification-bell";
import { MessageBell } from "@/components/dklist/message-bell";
import { AdminNavLink } from "@/components/dklist/admin-nav-link";

const NAV = [
  { href: "/ara", label: "Keşfet" },
  { href: "/kitaplar", label: "Kitaplar" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/cevirmenler", label: "Çevirmenler" },
  { href: "/yayinevleri", label: "Yayınevleri" },
  { href: "/askida-kitap", label: "Askıda Kitap" },
  { href: "/bloglar", label: "Bloglar" },
  { href: "/yazarhane", label: "Yazarhane" },
  { href: "/listeler", label: "Listeler" },
  { href: "/ayin-kitabi", label: "Ayın Kitabı" },
  { href: "/kulupler", label: "Kulüpler" },
  { href: "/rozetler", label: "Rozetler" },
  { href: "/puan-tablosu", label: "Puan Tablosu" },
  { href: "/puan-magazasi", label: "Puan Mağazası" },
  { href: "/premium", label: "Premium" },
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
          <AdminNavLink />
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
