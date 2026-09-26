import { getBlockedUsers } from "@/db/queries/blocks";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const users = await getBlockedUsers(session.userId);
  return mobileJson({ status: "ok", users });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
