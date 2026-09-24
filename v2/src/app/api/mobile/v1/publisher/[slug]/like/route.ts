import { getPublisherBySlug } from "@/db/queries/publishers";
import { togglePublisherLike } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const publisher = await getPublisherBySlug(slug);
  if (!publisher) {
    return mobileJson({ status: "not_found", message: "Yayınevi bulunamadı." }, { status: 404 });
  }

  const result = await togglePublisherLike(session.userId, publisher.id);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
