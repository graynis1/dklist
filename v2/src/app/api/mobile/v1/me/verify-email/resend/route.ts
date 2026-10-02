import { resendVerificationCode } from "@/db/queries/auth-account";
import { getMobileSession } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) {
    return mobileJson({ status: "invalid", message: "Giriş yapmalısınız." }, { status: 401 });
  }
  try {
    const result = await resendVerificationCode(session.userId);
    // The code itself is only returned when mail isn't configured (dev), same as registration.
    return mobileJson({ status: "ok", mailSent: result.mailSent, devVerificationCode: result.mailSent ? undefined : result.verificationCode });
  } catch (err) {
    return mobileJson({ status: "invalid", message: err instanceof Error ? err.message : "Kod gönderilemedi." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
