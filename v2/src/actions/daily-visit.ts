"use server";

import { auth } from "@/auth";
import { awardDailyVisitPoints } from "@/db/queries/points";

/**
 * Server Components must stay side-effect-free under Next's Cache
 * Components model - a real bug found via testing: awarding points
 * directly inside a Server Component's render (the original
 * DailyVisitTracker) crashed the page ("This page couldn't load"), since
 * RSC rendering isn't a safe place for a DB write to happen. Points-earning
 * writes belong in a Server Action, same as every other awardPoints() call
 * site in this app - this is the one DailyVisitTracker calls from a client
 * useEffect instead.
 */
/**
 * Returns whether a session was found (so the client can retry once) -
 * confirmed via testing that the very first render immediately after a
 * fresh signIn() redirect can briefly see no session here even though the
 * browser is genuinely signed in (any following navigation/reload sees it
 * correctly) - a narrow Next.js dev-mode redirect/RSC-payload timing
 * artifact, not a real auth bug. Rather than chasing that down further for
 * a "+2 points" nice-to-have, the client retries shortly after if needed.
 */
export async function awardDailyVisitPointsAction(): Promise<{ hadSession: boolean }> {
  const session = await auth();
  if (session?.user?.id) {
    await awardDailyVisitPoints(Number(session.user.id));
    return { hadSession: true };
  }
  return { hadSession: false };
}
