import { getBookBySlug, getWorkPooledScore } from "@/db/queries/book-detail";
import { getUserBookRating, getBookRatingCount } from "@/db/queries/rating";
import { getReadStatus } from "@/db/queries/reading-status";
import { isBookLiked, getBookLikeCount } from "@/db/queries/likes";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
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

  const [pooledScore, ratingCount, myRating, myStatus, likeCount, liked, comments] = await Promise.all([
    book.workId ? getWorkPooledScore(book.workId) : Promise.resolve(null),
    getBookRatingCount(book.id),
    session ? getUserBookRating(session.userId, book.id) : Promise.resolve(null),
    session ? getReadStatus(session.userId, book.id) : Promise.resolve(null),
    getBookLikeCount(book.id),
    session ? isBookLiked(session.userId, book.id) : Promise.resolve(false),
    getEntityComments(book.id, "book"),
  ]);

  const repliesByComment = await getRepliesForComments(comments.map((c) => c.id));
  const commentsWithReplies = comments.map((c) => ({ ...c, replies: repliesByComment.get(c.id) ?? [] }));

  return mobileJson({
    status: "ok",
    book,
    displayScore: pooledScore?.avgScore ?? book.score,
    pooledEditionCount: pooledScore?.editionCount ?? null,
    ratingCount: pooledScore?.voteCount ?? ratingCount,
    myRating,
    myStatus,
    likeCount,
    liked,
    comments: commentsWithReplies,
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
