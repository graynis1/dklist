import { getWeeklyLeaderboard, getUserWeeklyRank } from "@/db/queries/points";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  const [leaderboard, myRank] = await Promise.all([
    getWeeklyLeaderboard(),
    session ? getUserWeeklyRank(session.userId) : Promise.resolve(null),
  ]);
  return mobileJson({ status: "ok", leaderboard, myRank });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
