"use client";

import { formatRelativeTime } from "@/lib/utils";

/**
 * Real bug found via a live audit (2026-09-11): `formatRelativeTime()`
 * calls `Date.now()` during render. Inside a client component (the feed,
 * message threads) that means the server computes "5 dk önce" at request
 * time and the browser re-computes it at hydration time - if even one
 * minute/hour/day boundary passed in between (very common on a slow
 * mobile connection), the two text nodes differ. React treats that as a
 * hydration failure (error #418), discards the server tree, and - the
 * part that actually hurt users - **the whole page loses interactivity
 * until a hard refresh**. This was the concrete cause of the customer's
 * "tıkladığım yere gitmesi için sayfayı yenilemem gerekiyor" report on
 * the homepage (its activity-feed shelf renders these for every visitor,
 * signed in or not).
 *
 * `suppressHydrationWarning` is exactly the documented fix for
 * timestamps: React keeps the server-rendered text as-is and hydration
 * completes normally, interactivity intact. Client-side navigations
 * render it live from the start; a server-rendered page can show a value
 * a unit or two stale until the next re-render, which for a feed
 * timestamp is fine.
 */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso.replace(" ", "T")} suppressHydrationWarning className={className}>
      {formatRelativeTime(iso)}
    </time>
  );
}
