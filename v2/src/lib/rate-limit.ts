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
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prevents unbounded memory growth from a distributed-IP scan - a real
// vector for a rate limiter itself to become the resource-exhaustion
// vulnerability if never pruned.
const MAX_BUCKETS = 50_000;

function pruneIfNeeded(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  // Caddy (this app's reverse proxy) sets x-forwarded-for; take the first
  // hop only - anything after that is client-supplied and unverifiable.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/**
 * Returns true if the action is allowed, false if the caller has exceeded
 * `max` attempts within `windowMs`. `key` should include both the action
 * name and the identifier (IP, or IP+username for login) so different
 * actions/identities don't share a bucket.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneIfNeeded(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count++;
  return true;
}
