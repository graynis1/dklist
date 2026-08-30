"use server";

import { auth } from "@/auth";
import { setCommentReaction } from "@/db/queries/comment-likes";

// Shared across book/writer/translator pages (EntityComments imports this
// directly) - comment reactions aren't scoped to any one entity type, so
// unlike the other actions.ts files (bound per-page for their entity id/
// slug), this one needs no binding at all.
export async function setCommentReactionAction(
  commentId: number,
  value: 1 | -1,
): Promise<{ status: boolean; reaction?: 1 | -1 | null; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }

  const result = await setCommentReaction(Number(session.user.id), commentId, value);
  return { status: true, reaction: result.reaction };
}
