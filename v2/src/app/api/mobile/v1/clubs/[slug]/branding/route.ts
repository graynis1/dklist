import { getClubBySlug, updateClubBranding } from "@/db/queries/book-clubs";
import { clubImageUrl } from "@/lib/image-urls";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Multipart: image (file, optional), removeImage ("1"), color ("#rrggbb" or "" to clear). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  const imageValue = form.get("image");
  const colorRaw = form.get("color");
  try {
    const result = await updateClubBranding(
      club.id,
      {
        image: imageValue instanceof File && imageValue.size > 0 ? imageValue : null,
        removeImage: form.get("removeImage") === "1",
        color: colorRaw === null ? undefined : String(colorRaw) || null,
      },
      session.userId,
      session.userType,
    );
    return mobileJson({ status: "ok", image: result.image ? clubImageUrl(result.image) : null, color: result.color });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "Kaydedilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
