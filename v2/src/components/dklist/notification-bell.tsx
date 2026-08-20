import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { getUnreadNotificationCount } from "@/db/queries/notifications";

// Isolated in its own Suspense boundary for the same reason AuthStatus is -
// auth() reads cookies(), genuinely per-request data, so this shouldn't force
// the rest of SiteHeader (and every page using it) to opt out of the static
// shell.
export function NotificationBell() {
  return (
    <Suspense fallback={null}>
      <NotificationBellContent />
    </Suspense>
  );
}

async function NotificationBellContent() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const count = await getUnreadNotificationCount(Number(session.user.id));

  return (
    <Link
      href="/bildirimler"
      className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Bildirimler"
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
