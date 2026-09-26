import { requestPasswordReset } from "@/db/queries/auth-account";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const target = typeof body?.target === "string" ? body.target : "";

  try {
    const result = await requestPasswordReset(target);
    return mobileJson({
      status: "ok",
      userId: result.userId,
      mailSent: result.mailSent,
      devResetCode: result.mailSent ? undefined : result.resetCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sıfırlama isteği başarısız.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
