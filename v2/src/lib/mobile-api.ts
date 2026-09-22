/**
 * Shared response helper for the `/api/mobile/v1/*` routes. Not
 * `server-only` - it's plain response-shaping, safe to import anywhere.
 *
 * CORS is permissive here on purpose: a native app's own `fetch()` isn't
 * subject to browser CORS at all, but the Expo web target (react-native-web,
 * used during local dev/testing) IS a real browser context, and these
 * routes carry no cookie-based credential a CSRF-style attack could ride
 * along with (auth here is a bearer token the client attaches explicitly,
 * not an ambient cookie) - so permissive CORS doesn't weaken anything.
 */
export const MOBILE_API_VERSION = "1";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function mobileJson(data: unknown, init?: { status?: number }): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function mobileCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
