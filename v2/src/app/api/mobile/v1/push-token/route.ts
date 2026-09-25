import { registerPushToken, unregisterPushToken } from "@/db/queries/push-tokens";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const platform = typeof body?.platform === "string" ? body.platform : "unknown";
  if (!token) {
    return mobileJson({ status: "error", message: "Token gerekli." }, { status: 400 });
  }

  await registerPushToken(session.userId, token, platform);
  return mobileJson({ status: "ok" });
}

/** Called on logout, so a signed-out device stops receiving pushes for
 * the account it just left. */
export async function DELETE(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (token) await unregisterPushToken(session.userId, token);
  return mobileJson({ status: "ok" });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
