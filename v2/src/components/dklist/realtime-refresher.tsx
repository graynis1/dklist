"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Consumes /api/events (SSE) and triggers a router.refresh() whenever a
 * real notification/message arrives for the signed-in user - refreshes
 * every server component on the current page (including the header's
 * NotificationBell/MessageBell, both plain server components with no
 * client state of their own to update directly), the cheapest correct way
 * to reflect a live event without converting those into client components.
 * Silently no-ops when signed out (the route itself 401s, onerror just
 * lets the browser's own retry backoff handle it - no need to distinguish
 * "signed out" from "network hiccup" here).
 */
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = () => {
      router.refresh();
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
