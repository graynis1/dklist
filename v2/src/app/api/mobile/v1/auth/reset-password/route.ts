import { confirmPasswordReset, resendResetCode } from "@/db/queries/auth-account";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/** confirmPasswordReset() generates a random new password server-side and
 * emails it (v1's original design, matched by web too) - there's no
 * "choose a new password" step, so the response just tells the client
 * whether to show the emailed password on-screen (dev/no-mail fallback). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const userId = Number(body?.userId);
  const code = typeof body?.code === "string" ? body.code : "";

  if (!Number.isInteger(userId)) {
    return mobileJson({ status: "error", message: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const result = await confirmPasswordReset(userId, code);
    return mobileJson({
      status: "ok",
      mailSent: result.mailSent,
      devNewPassword: result.mailSent ? undefined : result.newPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Şifre sıfırlanamadı.";
    return mobileJson({ status: "error", message }, { status: 400 });
  }
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
