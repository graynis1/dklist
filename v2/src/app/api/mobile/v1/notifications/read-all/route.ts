import { markAllNotificationsRead } from "@/db/queries/notifications";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  await markAllNotificationsRead(session.userId);
  return mobileJson({ status: "ok" });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
