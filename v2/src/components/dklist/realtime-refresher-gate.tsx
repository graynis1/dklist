import { Suspense } from "react";
import { auth } from "@/auth";
import { RealtimeRefresher } from "@/components/dklist/realtime-refresher";

/** Only mounts the SSE client (RealtimeRefresher) when actually signed in -
 * without this gate, a signed-out visitor's browser would open /api/events,
 * get a 401, and retry indefinitely (EventSource's default reconnect
 * behavior), for a connection that can never succeed. Same Suspense-
 * isolation pattern as AuthStatus/NotificationBell (auth() reads cookies(),
 * genuinely per-request). */
export function RealtimeRefresherGate() {
  return (
    <Suspense fallback={null}>
      <RealtimeRefresherGateContent />
    </Suspense>
  );
}

async function RealtimeRefresherGateContent() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return <RealtimeRefresher />;
}
