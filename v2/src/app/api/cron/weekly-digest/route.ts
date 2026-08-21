import { NextResponse } from "next/server";
import { sendWeeklyDigestsNow } from "@/db/queries/weekly-digest";

/**
 * Real production scheduling for this hits here from a VPS crontab (a
 * deployment-time detail, not faked up in dev) - e.g.
 * `0 9 * * 1 curl -H "Authorization: Bearer $CRON_SECRET" https://dklist.com/api/cron/weekly-digest`
 * for "every Monday 9am". CRON_SECRET must be set in the real production
 * env for this route to do anything - without it, every request 401s
 * rather than silently mass-emailing on a misconfigured deploy.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendWeeklyDigestsNow();
  return NextResponse.json(result);
}
