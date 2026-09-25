import { getActiveRewards, getUserRedeemedRewardIds, getUserActiveFrame } from "@/db/queries/point-store";
import { getUserTotalPoints } from "@/db/queries/points";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  const [rewards, redeemedIds, totalPoints, activeFrame] = await Promise.all([
    getActiveRewards(),
    session ? getUserRedeemedRewardIds(session.userId) : Promise.resolve([]),
    session ? getUserTotalPoints(session.userId) : Promise.resolve(0),
    session ? getUserActiveFrame(session.userId) : Promise.resolve(null),
  ]);

  return mobileJson({ status: "ok", rewards, redeemedIds, totalPoints, activeFrame });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
