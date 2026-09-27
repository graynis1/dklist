import { setCommentReaction } from "@/db/queries/comment-likes";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Real gap: comment_like (the same table EntityComments/web's feed cards
 * already use) had no mobile route at all - the Akış feed's own comment/
 * quote cards carried a full likeState from getSiteFeed() that nothing on
 * mobile could ever act on.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const commentId = Number(id);
  const body = await request.json().catch(() => null);
  const value = body?.value === -1 ? -1 : 1;

  try {
    const result = await setCommentReaction(session.userId, commentId, value);
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
