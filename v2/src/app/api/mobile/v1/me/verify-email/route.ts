import { verifyMailCode } from "@/db/queries/auth-account";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** Mobile twin of the web /dogrula page - confirms the emailed code. */
export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!code.trim()) {
    return mobileJson({ status: "invalid", message: "Doğrulama kodunu gir." }, { status: 400 });
  }
  try {
    await verifyMailCode(session.userId, code);
    return mobileJson({ status: "ok" });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Doğrulanamadı." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
