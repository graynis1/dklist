import "server-only";
import { updateTag, revalidateTag } from "next/cache";

/**
 * `updateTag()` (immediate invalidation) only works when called from
 * within a Server Action - it throws a real, synchronous error from a
 * plain Route Handler ("updateTag can only be called from within a
 * Server Action... use revalidateTag instead"), confirmed by a real
 * mobile API call (`/api/mobile/v1/book/[slug]/rate`, a Route Handler)
 * hitting this exact error when it called the shared `rateBook()`, which
 * calls `updateTag()` internally for the web Server Action case.
 *
 * `rateBook()`/`setReadStatus()` etc. can't just switch to `revalidateTag`
 * outright - that was deliberately rejected before (see rating.ts's own
 * comment: `revalidateTag`'s stale-while-revalidate window caused a real,
 * reported staleness bug on the web read-your-own-write path). This tries
 * the strict, immediate `updateTag()` first (preserving that exact
 * existing behavior for every Server Action caller, i.e. the entire web
 * app, unchanged), and only falls back to `revalidateTag` when called from
 * a context where `updateTag` isn't allowed (Route Handlers - i.e. the
 * mobile API) - the one place a small staleness window is an acceptable
 * tradeoff against a hard failure.
 */
export function invalidateTag(tag: string): void {
  try {
    updateTag(tag);
  } catch {
    revalidateTag(tag, "max");
  }
}
