import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthStatus } from "@/components/dklist/auth-status";

const NAV = [
  { href: "#", label: "Keşfet" },
  { href: "#", label: "Yazarlar" },
  { href: "#", label: "Askıda Kitap" },
  { href: "#", label: "Bloglar" },
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
          <Input
            placeholder="Kitap, yazar, yayınevi ara…"
            className="hidden w-56 bg-secondary/60 lg:block"
          />
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
