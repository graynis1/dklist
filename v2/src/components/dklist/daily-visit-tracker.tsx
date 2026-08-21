"use client";

import { useEffect, useRef } from "react";
import { awardDailyVisitPointsAction } from "@/actions/daily-visit";

/** Renders nothing - purely a side-effecting mount, fired once per browser
 * tab load via a Server Action (not a DB write inside a Server Component's
 * render, which broke the page - see daily-visit.ts's doc comment).
 * Customer's "sitede geçirdikleri vakit de puan kazandırsın" ask, without
 * needing real dwell-time tracking - see awardDailyVisitPoints()'s own doc
 * comment for why this is the honest simple version of that.
 *
 * Retries once after a short delay if the very first attempt found no
 * session - a real, narrow timing gap confirmed via testing right after a
 * fresh signIn() redirect, gone by the very next navigation. Deliberately
 * no "cancelled on unmount" guard on the retry: React Strict Mode's dev-only
 * double-invoke would set that flag before the timeout ever fires, silently
 * cancelling the very retry this exists for. Worst case in production if
 * this ever did fire after a genuine unmount is one harmless extra
 * awardPoints() call, which is already idempotent.
 */
export function DailyVisitTracker() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    awardDailyVisitPointsAction().then((result) => {
      if (!result.hadSession) {
        setTimeout(() => {
          awardDailyVisitPointsAction().catch(() => {});
        }, 1500);
      }
    }).catch(() => {});
  }, []);

  return null;
}
