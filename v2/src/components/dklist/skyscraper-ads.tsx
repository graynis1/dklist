import { Suspense } from "react";
import { AdSlot } from "@/components/dklist/ad-slot";

/**
 * Customer's ask (2026-09-02, with a real screenshot): "sitenin neredeyse
 * her yerinde sağ sol paneller boş duruyor" - on a wide monitor, the
 * header spans up to max-w-[100rem] (1600px) but nearly every page's own
 * content maxes out well before that (max-w-6xl/4xl/3xl), leaving large,
 * genuinely empty gutters on both sides site-wide, not just on one page.
 * Fixed-positioned (not just `sticky`, which would still scroll away once
 * a short page's content ends) so these stay visible the whole time the
 * viewer is on the site, matching the customer's explicit "sticky de
 * olabilir" ask. Wired once in the root layout rather than per-page.
 *
 * Real bug found via customer report + screenshot: the first version used
 * Tailwind's stock `2xl` breakpoint (1536px), which overlapped real page
 * content on an ordinary 1920px-wide monitor. The homepage (and most
 * other pages) center their content in `max-w-[100rem]` (1600px) with
 * `px-6` (24px) padding inside that box - the box itself doesn't even
 * start shrinking below full-bleed until the viewport exceeds 1600px, so
 * at 1536-1900px there is close to ZERO real gutter, not "usually enough"
 * as first assumed. The actual content edge sits at `(viewport-1600)/2`
 * from the viewport edge; this ad (offset 16px, width 160px) needs that
 * to be >= ~226px with a safety margin, which only happens reliably past
 * roughly viewport ≈ 2050px - hence the custom `min-[2100px]` breakpoint
 * below instead of a stock Tailwind one. This deliberately means these
 * ads are ultra-wide/4K-adjacent-monitor-only, not "wide laptop" - a real
 * consequence of this site's own generously wide `max-w-[100rem]`
 * content columns, not a smaller ad fitting a smaller gutter.
 *
 * Each side is its own <Suspense> boundary around its own <AdSlot> -
 * AdSlot reads auth() internally, and rendering it as a bare sibling
 * inside a shared boundary is exactly the mistake that caused the
 * "Couldn't find all resumable slots" incident earlier this session
 * (see PLAN.md) - never repeat that here.
 */
export function SkyscraperAds() {
  return (
    <>
      <div className="pointer-events-none fixed top-24 left-4 z-10 hidden h-[min(80vh,850px)] w-40 min-[2100px]:block">
        <div className="pointer-events-auto h-full">
          <Suspense fallback={null}>
            <AdSlot placement="skyscraper-left" className="h-full" />
          </Suspense>
        </div>
      </div>
      <div className="pointer-events-none fixed top-24 right-4 z-10 hidden h-[min(80vh,850px)] w-40 min-[2100px]:block">
        <div className="pointer-events-auto h-full">
          <Suspense fallback={null}>
            <AdSlot placement="skyscraper-right" className="h-full" />
          </Suspense>
        </div>
      </div>
    </>
  );
}
