import { signInWithVerifiedEmail } from "@/lib/mobile-oauth-user";
import { mobileJson, mobileCorsPreflight } from "@/lib/mobile-api";

/**
 * Verifies the id_token against Google's own tokeninfo endpoint rather than
 * trusting a client-supplied payload, then signs the member in by email.
 * Needs real Google OAuth client IDs configured in the mobile app.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  if (!idToken) {
    return mobileJson({ status: "error", message: "Google kimlik bilgisi eksik." }, { status: 400 });
  }

  let payload: { email?: string; email_verified?: string; name?: string; given_name?: string; family_name?: string; aud?: string };
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) throw new Error("invalid token");
    payload = await res.json();
  } catch {
    return mobileJson({ status: "error", message: "Google kimlik doğrulaması başarısız." }, { status: 401 });
  }

  const expectedAudiences = [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);
  if (expectedAudiences.length > 0 && !expectedAudiences.includes(payload.aud)) {
    return mobileJson({ status: "error", message: "Google kimlik doğrulaması başarısız." }, { status: 401 });
  }

  if (!payload.email || payload.email_verified !== "true") {
    return mobileJson({ status: "error", message: "Google hesabının e-postası doğrulanmamış." }, { status: 401 });
  }

  return signInWithVerifiedEmail(payload.email, payload.given_name || payload.name || "", payload.family_name || "");
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
