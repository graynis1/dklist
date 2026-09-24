import { getWriterBySlug } from "@/db/queries/writers";
import { toggleWriterLike } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const writer = await getWriterBySlug(slug);
  if (!writer) {
    return mobileJson({ status: "not_found", message: "Yazar bulunamadı." }, { status: 404 });
  }

  const result = await toggleWriterLike(session.userId, writer.id);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
