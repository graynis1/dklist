import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { getUnreadMessageCount } from "@/db/queries/messages";

// Same Suspense-isolation pattern as AuthStatus/NotificationBell - auth()
// reads cookies(), genuinely per-request, kept out of the static shell.
export function MessageBell() {
  return (
    <Suspense fallback={null}>
      <MessageBellContent />
    </Suspense>
  );
}

async function MessageBellContent() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const count = await getUnreadMessageCount(Number(session.user.id));

  return (
    <Link
      href="/mesajlar"
      className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Mesajlar"
    >
      <span aria-hidden>✉️</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
