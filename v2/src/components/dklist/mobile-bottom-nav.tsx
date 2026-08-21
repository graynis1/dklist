import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getUnreadNotificationCount } from "@/db/queries/notifications";
import { getUnreadMessageCount } from "@/db/queries/messages";

/**
 * v1's BottomNav.js - a mobile-only nav bar (Ana Sayfa/Kitaplar/Bildirimler/
 * Mesajlar/Profil, or Giriş Yap when signed out). Found while auditing v1's
 * full GeneralComponents directory: v2's header nav is `hidden md:flex` with
 * no mobile fallback at all - confirmed by reading site-header.tsx directly,
 * not assumed - so small-screen users currently have no way to reach
 * Kitaplar/Bildirimler/Mesajlar/Profil except by typing a URL. Login here is
 * a real page (/giris), not v1's modal popup - matches the simpler pattern
 * already used consistently this session (e.g. legal pages over modals).
 */
export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <Link href="/" className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
        <span aria-hidden>🏠</span>
        Ana Sayfa
      </Link>
      <Link href="/kitaplar" className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
        <span aria-hidden>📚</span>
        Kitaplar
      </Link>
      <Suspense fallback={<LoggedOutItems />}>
        <SignedInItems />
      </Suspense>
    </nav>
  );
}

function LoggedOutItems() {
  return (
    <Link href="/giris" className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
      <span aria-hidden>🔑</span>
      Giriş Yap
    </Link>
  );
}

async function SignedInItems() {
  const session = await auth();
  if (!session?.user?.id) return <LoggedOutItems />;

  const userId = Number(session.user.id);
  const [notifCount, msgCount] = await Promise.all([
    getUnreadNotificationCount(userId),
    getUnreadMessageCount(userId),
  ]);

  return (
    <>
      <Link
        href="/bildirimler"
        className="relative flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden>🔔</span>
        Bildirimler
        {notifCount > 0 && (
          <span className="absolute -top-1 right-3 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {notifCount > 9 ? "9+" : notifCount}
          </span>
        )}
      </Link>
      <Link
        href="/mesajlar"
        className="relative flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden>💬</span>
        Mesajlar
        {msgCount > 0 && (
          <span className="absolute -top-1 right-3 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {msgCount > 9 ? "9+" : msgCount}
          </span>
        )}
      </Link>
      <Link
        href={`/profil/${session.user.name}`}
        className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <span aria-hidden>👤</span>
        Profil
      </Link>
    </>
  );
}
