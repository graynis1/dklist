import { sendMessage } from "@/db/queries/messages";
import { getProfileByUsername } from "@/db/queries/profile";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  let body: { username?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const text = typeof body.text === "string" ? body.text : "";
  if (!username || !text.trim()) {
    return mobileJson({ status: "invalid", message: "Kullanıcı adı ve mesaj gerekli." }, { status: 400 });
  }

  const profile = await getProfileByUsername(username);
  if (!profile) {
    return mobileJson({ status: "invalid", message: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  try {
    const result = await sendMessage(session.userId, profile.id, text);
    return mobileJson({ status: "ok", message: result });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Gönderilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
