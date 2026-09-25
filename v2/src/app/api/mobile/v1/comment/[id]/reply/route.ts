import { addSubComment } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Replying to a top-level comment only (parentType "comment") - v1's own
 * UI only ever unrolls two reply levels (see getRepliesForComments's own
 * doc comment); replying to a reply ("subComment" parent) isn't wired on
 * mobile yet, same real depth cut, not an oversight. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const commentId = Number(id);
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  try {
    const replyId = await addSubComment(session.userId, "comment", commentId, text);
    return mobileJson({ status: "ok", id: replyId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yanıt eklenemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
