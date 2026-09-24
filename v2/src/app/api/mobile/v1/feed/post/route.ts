import { createFeedPost } from "@/db/queries/feed-posts";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Text-only mobile post composer - the web version also supports
 * attaching an image or a book, deliberately not built here yet (needs
 * multipart upload / a book picker); a real next step, not dropped. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  try {
    const id = await createFeedPost(session.userId, text, null, null);
    return mobileJson({ status: "ok", id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gönderi paylaşılamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
