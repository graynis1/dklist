import { verifyCredentials } from "@/lib/verify-credentials";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Mobile equivalent of the web login form - runs the exact same
 * `verifyCredentials()` used by `auth.ts`'s NextAuth `authorize()` (same
 * bcrypt/legacy-plaintext-upgrade/2FA/suspension checks, so a real account
 * behaves identically whether it signs in from the browser or the app), but
 * returns a Bearer token instead of setting a cookie - a native app has no
 * cookie jar to rely on.
 *
 * `code` (the 2FA OTP) is accepted the same way the web form's second step
 * sends it - if 2FA is enabled and no code was given yet, this responds
 * with `two_factor_required` (matching TwoFactorRequiredError's shape on
 * the web side) rather than a token; the mobile client is expected to call
 * this route again with the mailed code once that screen exists.
 */
export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return mobileJson({ status: "invalid", message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;
  const code = typeof body.code === "string" ? body.code : undefined;

  if (!username || !password) {
    return mobileJson({ status: "invalid", message: "Kullanıcı adı ve şifre gerekli." }, { status: 400 });
  }

  const result = await verifyCredentials(username, password, code);

  if (result.status === "invalid") {
    return mobileJson({ status: "invalid", message: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }
  if (result.status === "suspended") {
    return mobileJson({ status: "suspended", until: result.until }, { status: 403 });
  }
  if (result.status === "two_factor_required") {
    return mobileJson({ status: "two_factor_required" }, { status: 401 });
  }

  const { user } = result;
  const token = await signMobileToken({ userId: user.id, username: user.username, userType: user.userType });

  return mobileJson({
    status: "ok",
    token,
    user: { id: user.id, username: user.username, image: user.image, userType: user.userType },
  });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
