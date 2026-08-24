"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MenuIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Keşfet",
    links: [
      { href: "/ara", label: "Keşfet" },
      { href: "/kitaplar", label: "Kitaplar" },
      { href: "/yazarlar", label: "Yazarlar" },
      { href: "/cevirmenler", label: "Çevirmenler" },
      { href: "/yayinevleri", label: "Yayınevleri" },
    ],
  },
  {
    title: "Topluluk",
    links: [
      { href: "/akis", label: "Akış" },
      { href: "/askida-kitap", label: "Askıda Kitap" },
      { href: "/kulupler", label: "Kulüpler" },
      { href: "/listeler", label: "Listeler" },
      { href: "/ayin-kitabi", label: "Ayın Kitabı" },
      { href: "/bloglar", label: "Bloglar" },
      { href: "/yazarhane", label: "Yazarhane" },
    ],
  },
  {
    title: "Etkileşim",
    links: [
      { href: "/rozetler", label: "Rozetler" },
      { href: "/puan-tablosu", label: "Puan Tablosu" },
      { href: "/puan-magazasi", label: "Puan Mağazası" },
      { href: "/premium", label: "Premium" },
    ],
  },
];

/**
 * Mobile-only "yan panel" (side panel) - a real slide-in drawer, not the
 * desktop dropdown. Before this, the full discovery nav (site-header.tsx's
 * NAV list) was `hidden md:flex` with zero mobile fallback - MobileBottomNav
 * covers the 5 core account actions (home/books/notifications/messages/
 * profile) but had no path to Yazarlar/Kulüpler/Rozetler/etc. at all on a
 * phone. This is the missing other half, reachable from a hamburger button
 * in the header itself (md:hidden, mirrored against the header's own
 * breakpoint like every other mobile-specific piece in this app).
 */
export function MobileNavDrawer() {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden">
        <MenuIcon className="size-5" />
        <span className="sr-only">Menüyü aç</span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-[82vw] max-w-xs flex-col overflow-y-auto bg-background p-5 shadow-xl duration-200 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <span className="font-heading text-lg font-semibold italic">DKList</span>
            <DialogPrimitive.Close className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <XIcon className="size-4" />
              <span className="sr-only">Kapat</span>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex flex-col gap-6">
            {SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {section.title}
                </p>
                {section.links.map((link) => (
                  <DialogPrimitive.Close
                    key={link.href}
                    nativeButton={false}
                    render={<Link href={link.href} />}
                    className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-accent"
                  >
                    {link.label}
                  </DialogPrimitive.Close>
                ))}
              </div>
            ))}
          </nav>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
