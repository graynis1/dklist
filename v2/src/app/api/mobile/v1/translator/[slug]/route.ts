import { getTranslatorBySlug, getBooksByTranslator } from "@/db/queries/translators";
import { isTranslatorLiked, getTranslatorLikeCount } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const translator = await getTranslatorBySlug(slug);
  if (!translator) {
    return mobileJson({ status: "not_found", message: "Çevirmen bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [books, likeCount, liked] = await Promise.all([
    getBooksByTranslator(translator.id),
    getTranslatorLikeCount(translator.id),
    session ? isTranslatorLiked(session.userId, translator.id) : Promise.resolve(false),
  ]);

  return mobileJson({ status: "ok", translator, books, likeCount, liked });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
