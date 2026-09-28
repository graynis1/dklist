import { createRemoteJWKSet, jwtVerify } from "jose";
import { signInWithVerifiedEmail } from "@/lib/mobile-oauth-user";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// The app's own bundle id, plus Expo Go's while testing through it.
const AUDIENCES = ["com.dklist.app", "host.exp.Exponent"];

/**
 * Sign in with Apple (required by App Store guideline 4.8 because the app
 * also offers Google sign-in). The identity token is a JWT signed by Apple -
 * verified here against Apple's published keys, issuer and our bundle id.
 * Apple only hands the user's name to the app on the very first
 * authorization, so the client forwards it and it is used only when the
 * account is being created.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identityToken = typeof body?.identityToken === "string" ? body.identityToken : "";
  if (!identityToken) {
    return mobileJson({ status: "error", message: "Apple kimlik bilgisi eksik." }, { status: 400 });
  }

  let email: string | undefined;
  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, { issuer: "https://appleid.apple.com", audience: AUDIENCES });
    email = typeof payload.email === "string" ? payload.email : undefined;
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (!email || !verified) {
      return mobileJson({ status: "error", message: "Apple hesabından doğrulanmış bir e-posta alınamadı." }, { status: 401 });
    }
  } catch {
    return mobileJson({ status: "error", message: "Apple kimlik doğrulaması başarısız." }, { status: 401 });
  }

  const givenName = typeof body?.givenName === "string" ? body.givenName.slice(0, 60) : "";
  const familyName = typeof body?.familyName === "string" ? body.familyName.slice(0, 60) : "";
  return signInWithVerifiedEmail(email, givenName, familyName);
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
