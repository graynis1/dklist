import { getPremiumSettings, isUserPremium, getPremiumExpiry } from "@/db/queries/premium";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const settings = await getPremiumSettings();
  const session = await getMobileSession(request);
  const [isPremium, expiresAt] = session
    ? await Promise.all([isUserPremium(session.userId), getPremiumExpiry(session.userId)])
    : [false, null];

  return mobileJson({ status: "ok", settings, isPremium, expiresAt });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
