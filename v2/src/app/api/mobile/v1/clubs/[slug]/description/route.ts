import { getClubBySlug, updateClubDescription } from "@/db/queries/book-clubs";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const body = await request.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description : "";

  const club = await getClubBySlug(slug);
  if (!club) {
    return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  }

  try {
    await updateClubDescription(club.id, description, session.userId, session.userType);
    return mobileJson({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Güncellenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
