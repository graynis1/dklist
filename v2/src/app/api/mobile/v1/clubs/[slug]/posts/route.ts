import { getClubBySlug } from "@/db/queries/book-clubs";
import { getClubPosts, createClubPost } from "@/db/queries/club-posts";
import { feedPostImageUrl } from "@/lib/image-urls";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** In-club posts (text + image, likes, replies). GET ?before=<id> pages older posts. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });
  const session = await getMobileSession(request);
  const before = Number(new URL(request.url).searchParams.get("before")) || undefined;
  const page = await getClubPosts(club.id, session?.userId ?? null, 20, before);
  return mobileJson({
    status: "ok",
    items: page.items.map((p) => ({ ...p, image: p.image ? feedPostImageUrl(p.image) : null })),
    nextCursor: page.nextCursor,
  });
}

/** Multipart: text, optional image. Members only. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return mobileJson({ status: "not_found", message: "Kulüp bulunamadı." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  const text = String(form.get("text") ?? "");
  const imageValue = form.get("image");
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;

  try {
    const id = await createClubPost(club.id, session.userId, text, image);
    return mobileJson({ status: "ok", id });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "Gönderi paylaşılamadı." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
