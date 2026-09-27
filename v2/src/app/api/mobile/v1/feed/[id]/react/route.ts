import { setFeedPostReaction } from "@/db/queries/feed-posts";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { id } = await params;
  const postId = Number(id);
  const body = await request.json().catch(() => null);
  const value = body?.value === -1 ? -1 : 1;

  try {
    const result = await setFeedPostReaction(session.userId, postId, value);
    return mobileJson({ status: "ok", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
