import { getBookBySlug } from "@/db/queries/book-detail";
import { rateBook } from "@/db/queries/rating";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Lives under `book/[slug]/rate`, not `book/[id]/rate` - Next.js requires
 * every dynamic segment at the same path position to share one parameter
 * name (a real error caught via testing: "You cannot use different slug
 * names for the same dynamic path ('id' !== 'slug')", since the sibling
 * `book/[slug]` detail route already claims that position). Resolves the
 * slug to a real id here rather than pushing that resolution onto the
 * mobile client.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const book = await getBookBySlug(decodeURIComponent(slug));
  if (!book) {
    return mobileJson({ status: "invalid", message: "Kitap bulunamadı." }, { status: 404 });
  }

  let body: { value?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const value = Number(body.value);

  try {
    const result = await rateBook(session.userId, book.id, value, book.slug);
    return mobileJson({ status: "ok", ...result });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Puan verilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
