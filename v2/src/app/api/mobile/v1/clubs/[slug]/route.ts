import { getClubBySlug, isClubMember, hasPendingClubJoinRequest } from "@/db/queries/book-clubs";
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

export async function OPTIONS() {
  return mobileCorsPreflight();
}
