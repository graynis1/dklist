/**
 * Pure sliding-window-bucket logic, split out of rate-limit.ts so it can be
 * unit-tested directly. rate-limit.ts carries `import "server-only"` (needed
 * for its getClientIp()'s next/headers use) - confirmed that's an
 * unconditional throw at module load (node_modules/server-only/index.js),
 * not a bundler-only guard, so the whole module is unimportable from a plain
 * Node test runner like vitest. Same reasoning as roles.ts/image-urls.ts's
 * earlier extractions for the identical client-bundle-pollution failure
 * class, applied here for test-importability instead.
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

/**
 * Returns true if the action is allowed, false if the caller has exceeded
 * `max` attempts within `windowMs`. `key` should include both the action
 * name and the identifier (IP, or IP+username for login) so different
 * actions/identities don't share a bucket. `now` defaults to the real clock
 * and only exists as a parameter so tests can drive it deterministically.
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
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

/** Test-only escape hatch - production call sites never need this. */
export function __resetRateLimitBucketsForTests(): void {
  buckets.clear();
}
