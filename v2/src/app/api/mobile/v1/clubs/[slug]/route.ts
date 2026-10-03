import { getClubBySlug, isClubMember, hasPendingClubJoinRequest, deleteClub, canManageClub } from "@/db/queries/book-clubs";
import { clubImageUrl } from "@/lib/image-urls";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [isMember, isPending, canManage] = session
    ? await Promise.all([isClubMember(club.id, session.userId), hasPendingClubJoinRequest(club.id, session.userId), canManageClub(club.id, session.userId, session.userType)])
    : [false, false, false];
  const myRole = session ? (club.members.find((m) => m.userId === session.userId)?.role ?? null) : null;

  return mobileJson({
    status: "ok",
    club: { ...club, image: club.image ? clubImageUrl(club.image) : null },
    isMember,
    isPending,
    canManage,
    myRole,
  });
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
