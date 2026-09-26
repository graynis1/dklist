import { exportUserData } from "@/db/queries/data-export";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * KVKK "Verilerimi İndir" - web's /api/veri-indir uses the NextAuth cookie
 * session, which the mobile app doesn't share, so it needed its own
 * Bearer-token-gated twin rather than just linking to the web URL.
 */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Oturum geçersiz veya süresi dolmuş." }, { status: 401 });
  }

  const data = await exportUserData(session.userId);
  return mobileJson({ status: "ok", data });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
