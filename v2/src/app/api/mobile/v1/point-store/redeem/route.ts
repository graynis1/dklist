import { redeemReward } from "@/db/queries/point-store";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rewardId = Number(body?.rewardId);

  const result = await redeemReward(session.userId, rewardId);
  return mobileJson({ status: result.status ? "ok" : "error", message: result.message });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
