import "server-only";
import { headers } from "next/headers";

/**
 * Simple in-memory sliding-window rate limiter - no public-facing form in
 * this app had ANY abuse protection (login, register, password-reset-
 * request, support tickets, ad inquiries all accepted unlimited automated
 * submissions). In-memory is a deliberate, correct choice here (not a
 * shortcut) - this app runs as a single long-lived Node process on one VPS,
 * not multiple serverless instances that would each have their own
 * disconnected memory, so there's no correctness gap a Redis-backed limiter
 * would close that justifies a new paid/self-hosted dependency for it.
 * Resets on deploy/restart - acceptable, this is abuse mitigation, not a
 * security boundary that must survive process restarts.
 *
 * The actual bucket logic lives in rate-limit-core.ts (no server-only/
 * next/headers imports) so it can be unit-tested directly - see that file's
 * comment for why importing this file itself isn't testable outside a real
 * Next.js server context.
 */
export { checkRateLimit } from "./rate-limit-core";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  // Caddy (this app's reverse proxy) sets x-forwarded-for; take the first
  // hop only - anything after that is client-supplied and unverifiable.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
