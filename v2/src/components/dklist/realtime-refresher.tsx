"use client";

import { useEffect, useRef } from "react";
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = () => {
      // Every server-side event type (notification, message, follow,
      // badge, club activity...) lands here and each triggers a full
      // router.refresh() (re-fetches every server component on the page).
      // A burst of activity used to mean a burst of full refreshes -
      // genuinely janky on a slower device (part of the "site donuyor"
      // report, 2026-09-10). Coalesce them: one refresh ~1s after the
      // last event in a burst.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 1000);
    };
    return () => {
      source.close();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
