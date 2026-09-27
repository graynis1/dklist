import { createAuthorPost } from "@/db/queries/yazarhane";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** createAuthorPost() itself enforces the Yazar-only rule against the live DB role. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  let body: { title?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  try {
    const id = await createAuthorPost(session.userId, String(body.title ?? ""), String(body.content ?? ""));
    return mobileJson({ status: "ok", id });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Paylaşılamadı." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
