import { getPublisherBySlug, getBooksByPublisher } from "@/db/queries/publishers";
import { isPublisherLiked, getPublisherLikeCount } from "@/db/queries/likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const publisher = await getPublisherBySlug(slug);
  if (!publisher) {
    return mobileJson({ status: "not_found", message: "Yayınevi bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [books, likeCount, liked] = await Promise.all([
    getBooksByPublisher(publisher.id),
    getPublisherLikeCount(publisher.id),
    session ? isPublisherLiked(session.userId, publisher.id) : Promise.resolve(false),
  ]);

  return mobileJson({ status: "ok", publisher, books, likeCount, liked });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
