"use client";

import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMMUNITY_LINKS = [
  { href: "/cevirmenler", label: "Çevirmenler" },
  { href: "/askida-kitap", label: "Askıda Kitap" },
  { href: "/kulupler", label: "Kulüpler" },
  { href: "/listeler", label: "Listeler" },
  { href: "/ayin-kitabi", label: "Ayın Kitabı" },
  { href: "/bloglar", label: "Bloglar" },
  { href: "/yazarhane", label: "Yazarhane" },
  { href: "/rozetler", label: "Rozetler" },
  { href: "/puan-tablosu", label: "Puan Tablosu" },
  { href: "/puan-magazasi", label: "Puan Mağazası" },
  { href: "/premium", label: "Premium" },
];

/**
 * Groups the site's secondary/community sections behind one trigger instead
 * of listing all of them inline - the header nav previously put all 15 links
 * in one unwrapped flex row, which overflowed the viewport at ordinary
 * desktop widths (a real horizontal-scroll bug, not just visual clutter) and
 * buried the handful of links a first-time/signed-out visitor actually needs
 * (Keşfet/Kitaplar/Yazarlar/Yayınevleri) among engagement features that only
 * matter once someone's already a member (points, badges, clubs).
 */
export function CommunityMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground data-popup-open:text-foreground">
        Topluluk
        <ChevronDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {COMMUNITY_LINKS.map((item) => (
          <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
