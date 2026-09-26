import { getWriterBySlug, getBooksByWriter } from "@/db/queries/writers";
import { isWriterLiked, getWriterLikeCount } from "@/db/queries/likes";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writer = await getWriterBySlug(slug);
  if (!writer) {
    return mobileJson({ status: "not_found", message: "Yazar bulunamadı." }, { status: 404 });
  }

  const session = await getMobileSession(request);
  const [books, likeCount, liked, comments] = await Promise.all([
    getBooksByWriter(writer.id),
    getWriterLikeCount(writer.id),
    session ? isWriterLiked(session.userId, writer.id) : Promise.resolve(false),
    getEntityComments(writer.id, "writer"),
  ]);

  const repliesByComment = await getRepliesForComments(comments.map((c) => c.id));
  const commentsWithReplies = comments.map((c) => ({ ...c, replies: repliesByComment.get(c.id) ?? [] }));

  return mobileJson({ status: "ok", writer, books, likeCount, liked, comments: commentsWithReplies });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
