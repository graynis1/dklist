import { updateComment, deleteComment, updateSubComment, deleteSubComment } from "@/db/queries/comments";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Edit/delete the caller's own comment, quote or reply (?kind=reply for a reply). */
async function handle(request: Request, params: Promise<{ id: string }>, method: "PATCH" | "DELETE") {
  const session = await getMobileSession(request);
  if (!session) return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  const id = Number((await params).id);
  const isReply = new URL(request.url).searchParams.get("kind") === "reply";
  try {
    if (method === "DELETE") {
      if (isReply) await deleteSubComment(session.userId, id);
      else await deleteComment(session.userId, id);
    } else {
      const body = await request.json().catch(() => null);
      const text = String(body?.text ?? "");
      if (isReply) await updateSubComment(session.userId, id, text);
      else await updateComment(session.userId, id, text);
    }
    return mobileJson({ status: "ok" });
  } catch (error) {
    return mobileJson({ status: "error", message: error instanceof Error ? error.message : "İşlem yapılamadı." }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, "PATCH");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, "DELETE");
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
