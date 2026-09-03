import Link from "next/link";
import {
  Rss,
  CircleUserIcon,
  BellIcon,
  MessageCircleIcon,
  UsersIcon,
  PenLineIcon,
  NewspaperIcon,
  TrophyIcon,
  CalendarIcon,
  GiftIcon,
  HeartIcon,
  ListIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { getUnreadNotificationCount } from "@/db/queries/notifications";
import { getUnreadMessageCount } from "@/db/queries/messages";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";

/**
 * Facebook's left-rail shortcut list, adapted to this site's own real
 * destinations - maintainer's explicit ask ("örnek olarak facebook ve
 * reddit iletiyorum... geniş çaplı çalış") for /akis (and by extension the
 * rest of the "topluluk" section) to read as a genuine, fully-fleshed-out
 * social platform rather than a single centered column. Every link here is
 * a real, already-built page - no placeholder destinations.
 */
export async function CommunitySidebarNav() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const username = session?.user?.name ?? null;

  const [notifCount, msgCount] = userId
    ? await Promise.all([getUnreadNotificationCount(userId), getUnreadMessageCount(userId)])
    : [0, 0];
  const decoration = userId ? decorationFor(await getUserDecorations([userId]), userId) : undefined;

  const links = [
    { href: "/akis", label: "Akış", icon: Rss },
    ...(username ? [{ href: `/profil/${username}`, label: "Profilim", icon: CircleUserIcon }] : []),
    ...(userId
      ? [
          { href: "/bildirimler", label: "Bildirimler", icon: BellIcon, badge: notifCount },
          { href: "/mesajlar", label: "Mesajlar", icon: MessageCircleIcon, badge: msgCount },
          { href: "/favorilerim", label: "Favorilerim", icon: HeartIcon },
          { href: "/listelerim", label: "Listelerim", icon: ListIcon },
        ]
      : []),
    { href: "/kulupler", label: "Kulüpler", icon: UsersIcon },
    { href: "/yazarhane", label: "Yazarhane", icon: PenLineIcon },
    { href: "/bloglar", label: "Bloglar", icon: NewspaperIcon },
    { href: "/puan-tablosu", label: "Puan Tablosu", icon: TrophyIcon },
    { href: "/ayin-kitabi", label: "Ayın Kitabı", icon: CalendarIcon },
    { href: "/askida-kitap", label: "Askıda Kitap", icon: GiftIcon },
  ];

  return (
    <nav className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      {username && userId && (
        <Link
          href={`/profil/${username}`}
          className="mb-1 flex items-center gap-2.5 rounded-lg p-2.5 transition-colors hover:bg-accent"
        >
          <EntityAvatar
            id={userId}
            name={username}
            size="size-10"
            profileFrame={decoration?.profileFrame}
            frameTier={decoration?.frameTier}
            highestBadge={decoration?.highestBadge}
          />
          <span className="truncate text-[0.95rem] font-medium">{username}</span>
        </Link>
      )}
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-[0.95rem] transition-colors hover:bg-accent"
        >
          <link.icon className="size-5 text-muted-foreground" />
          <span className="flex-1 truncate">{link.label}</span>
          {"badge" in link && link.badge! > 0 && (
            <span className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {link.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
