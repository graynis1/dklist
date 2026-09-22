import { mobileJson, mobileCorsPreflight, MOBILE_API_VERSION } from "@/lib/mobile-api";

/**
 * Unauthenticated connectivity/compatibility check - the mobile app hits
 * this on launch (and can act on `apiVersion` later if a breaking mobile
 * API change ever needs a "please update the app" screen instead of
 * silently failing every request).
 */
export async function GET() {
  return mobileJson({ status: "ok", apiVersion: MOBILE_API_VERSION });
}

export async function OPTIONS() {
  return mobileCorsPreflight();
}
