import { resendResetCode } from "@/db/queries/auth-account";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  if (!Number.isInteger(userId)) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const result = await resendResetCode(userId);
    return mobileJson({ status: "ok", mailSent: result.mailSent, devResetCode: result.mailSent ? undefined : result.resetCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kod tekrar gönderilemedi.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
