import { getBookBySlug, getWorkPooledScore } from "@/db/queries/book-detail";
import { getUserBookRating, getBookRatingCount } from "@/db/queries/rating";
import { getReadStatus } from "@/db/queries/reading-status";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile book detail - same real data the web `/kitap/[slug]` page shows:
 * pooled work score when one exists (falls back to the edition's own),
 * the caller's own rating/read-status when signed in. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookBySlug(decodeURIComponent(slug));
  if (!book) {
    return mobileJson({ status: "invalid", message: "Kitap bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);

  const [pooledScore, ratingCount, myRating, myStatus] = await Promise.all([
    book.workId ? getWorkPooledScore(book.workId) : Promise.resolve(null),
    getBookRatingCount(book.id),
    session ? getUserBookRating(session.userId, book.id) : Promise.resolve(null),
    session ? getReadStatus(session.userId, book.id) : Promise.resolve(null),
  ]);

  return mobileJson({
    status: "ok",
    book,
    displayScore: pooledScore?.avgScore ?? book.score,
    pooledEditionCount: pooledScore?.editionCount ?? null,
    ratingCount: pooledScore?.voteCount ?? ratingCount,
    myRating,
    myStatus,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
