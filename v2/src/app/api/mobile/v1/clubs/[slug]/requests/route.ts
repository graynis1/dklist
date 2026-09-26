import { getClubBySlug, getClubJoinRequests } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Owner/Mod-only - `getClubJoinRequests` itself throws (via
 * `requireClubManagePermission`) for anyone else, same as the web action. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  try {
    const items = await getClubJoinRequests(club.id, session.userId, session.userType);
    return mobileJson({ status: "ok", items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İstekler alınamadı.";
    return mobileJson({ status: "error", message }, { status: 403 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
