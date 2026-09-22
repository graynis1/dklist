import "server-only";
import { SignJWT, jwtVerify } from "jose";

/**
 * Bearer-token auth for the native mobile app - deliberately separate from
 * Auth.js's own web session JWT (httpOnly cookie, browser-only). A native
 * app has no cookie jar to rely on, so it authenticates with an
 * `Authorization: Bearer <token>` header instead, verified here.
 *
 * Uses its own secret (`MOBILE_JWT_SECRET`, falls back to `AUTH_SECRET` only
 * so a fresh clone that hasn't set it yet doesn't hard-crash) rather than
 * reusing Auth.js's session JWT format - the two token systems have
 * different audiences/lifetimes/rotation needs, and keeping them
 * independent means rotating one can never accidentally invalidate or
 * (worse) get confused with the other.
 */
const MOBILE_JWT_SECRET = process.env.MOBILE_JWT_SECRET ?? process.env.AUTH_SECRET;

function secretKey(): Uint8Array {
  if (!MOBILE_JWT_SECRET) {
    throw new Error("MOBILE_JWT_SECRET (or AUTH_SECRET) must be set to issue/verify mobile tokens.");
  }
  return new TextEncoder().encode(MOBILE_JWT_SECRET);
}

export interface MobileTokenPayload {
  userId: number;
  username: string;
  userType: string;
}

// 30 days - a native app is expected to stay signed in across launches like
// any real mobile app (no browser session semantics to lean on); the mobile
// screens/refresh-token question (whether to add a short-lived
// access+refresh pair instead of one long-lived token) is real future work,
// deliberately not decided here - this is the simplest thing that works for
// the infra-only phase, not a final security design.
const TOKEN_TTL = "30d";

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey());
}

/** Returns null on any invalid/expired/missing token - callers treat that as "not signed in", never throw further up. */
export async function verifyMobileToken(token: string): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "number" || typeof payload.username !== "string" || typeof payload.userType !== "string") {
      return null;
    }
    return { userId: payload.userId, username: payload.username, userType: payload.userType };
  } catch {
    return null;
  }
}

/** Extracts and verifies the bearer token from a mobile API request's Authorization header. */
export async function getMobileSession(request: Request): Promise<MobileTokenPayload | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return verifyMobileToken(header.slice("Bearer ".length).trim());
}
