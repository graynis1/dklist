import { getClubBySlug, isClubMember, hasPendingClubJoinRequest, deleteClub } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [isMember, isPending] = session
    ? await Promise.all([isClubMember(club.id, session.userId), hasPendingClubJoinRequest(club.id, session.userId)])
    : [false, false];

  return mobileJson({ status: "ok", club, isMember, isPending });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
    await deleteClub(club.id, session.userId, session.userType);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kulüp silinemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
