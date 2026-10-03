import { getMyPublisherApplication, submitPublisherApplication } from "@/db/queries/yazarhane";
import { getMobileSession } from "@/lib/mobile-auth";
import { getLiveUserType } from "@/lib/mobile-user-role";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Publisher-account application status for the caller. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const [application, userType] = await Promise.all([getMyPublisherApplication(session.userId), getLiveUserType(session.userId)]);
  return mobileJson({ status: "ok", application, isPublisher: userType === "Yayinevi" });
}

/** POST { message, publisherId? } */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const result = await submitPublisherApplication(session.userId, String(body?.message ?? ""), Number(body?.publisherId) || null);
  if (!result.status) return mobileJson({ status: "invalid", message: result.message }, { status: 400 });
  return mobileJson({ status: "ok" });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
