import { getBookBySlug } from "@/db/queries/book-detail";
import { toggleBookLike } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) {
    return mobileJson({ status: "not_found", message: "Kitap bulunamadı." }, { status: 404 });
  }

  const result = await toggleBookLike(session.userId, book.id);
  return mobileJson({ status: "ok", ...result });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
