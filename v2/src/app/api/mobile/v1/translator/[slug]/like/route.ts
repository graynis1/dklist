import { getTranslatorBySlug } from "@/db/queries/translators";
import { toggleTranslatorLike } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const translator = await getTranslatorBySlug(slug);
  if (!translator) {
    return mobileJson({ status: "not_found", message: "Çevirmen bulunamadı." }, { status: 404 });
  }

  const result = await toggleTranslatorLike(session.userId, translator.id);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
