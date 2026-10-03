import { getClubBySlug, removeClubMember, setClubMemberRole } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug, userId } = await params;
  const targetUserId = Number(userId);
  if (!Number.isInteger(targetUserId)) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  try {
    await removeClubMember(club.id, targetUserId, session.userId, session.userType);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Üye çıkarılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

/** PATCH { role: "admin" | "member" } - owner promotes/demotes a club admin. */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; userId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const { slug, userId } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role === "admin" ? "admin" : body?.role === "member" ? "member" : null;
  if (!role) return mobileJson({ status: "error", message: "Geçersiz rol." }, { status: 400 });
  const club = await getClubBySlug(slug);
  if (!club) return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  try {
    await setClubMemberRole(club.id, Number(userId), role, session.userId, session.userType);
    return mobileJson({ status: "ok" });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "Rol değiştirilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
