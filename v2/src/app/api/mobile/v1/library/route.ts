import { getBooksByStatus } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile "Kitaplığım" - same grouped-by-status shelves the web profile
 * page already renders (getBooksByStatus()), Bearer-gated since it's
 * always the caller's own library, never someone else's. */
export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const grouped = await getBooksByStatus(session.userId);
  return mobileJson({ status: "ok", ...grouped });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
