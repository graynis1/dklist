import { getClubBySlug } from "@/db/queries/book-clubs";
import { deleteClubPost } from "@/db/queries/club-posts";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; postId: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const { slug, postId } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  try {
    await deleteClubPost(club.id, Number(postId), session.userId, session.userType);
    return mobileJson({ status: "ok" });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "Gönderi silinemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
