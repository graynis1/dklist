"use server";

import { auth } from "@/auth";
import { toggleCommentLike } from "@/db/queries/comment-likes";

// Shared across book/writer/translator pages (EntityComments imports this
// directly) - comment likes aren't scoped to any one entity type, so unlike
// the other actions.ts files (bound per-page for their entity id/slug), this
// one needs no binding at all.
export async function toggleCommentLikeAction(
  commentId: number,
): Promise<{ status: boolean; liked?: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await toggleCommentLike(Number(session.user.id), commentId);
  return { status: true, liked: result.liked };
}
