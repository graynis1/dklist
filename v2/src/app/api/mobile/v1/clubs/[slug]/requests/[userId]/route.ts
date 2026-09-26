import { getClubBySlug, approveClubJoinRequest, rejectClubJoinRequest } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** `?action=approve|reject` - a single route for both since they're
 * otherwise identical (resolve slug->club, resolve targetUserId, delegate,
 * same error shape). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug, userId } = await params;
  const targetUserId = Number(userId);
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  if (!Number.isInteger(targetUserId) || (action !== "approve" && action !== "reject")) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  try {
    if (action === "approve") {
      await approveClubJoinRequest(club.id, targetUserId, session.userId, session.userType);
    } else {
      await rejectClubJoinRequest(club.id, targetUserId, session.userId, session.userType);
    }
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız oldu.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
