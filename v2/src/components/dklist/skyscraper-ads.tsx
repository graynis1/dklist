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
 * Only shown at the `2xl` breakpoint (1536px) and up - below that there
 * usually isn't enough real empty gutter width left to place a legible ad
 * without it colliding with actual page content, so this deliberately
 * does NOT try to appear on ordinary laptop/tablet/phone viewports.
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
      <div className="pointer-events-none fixed top-24 left-4 z-10 hidden h-[600px] w-40 2xl:block">
        <div className="pointer-events-auto h-full">
          <Suspense fallback={null}>
            <AdSlot placement="skyscraper-left" className="h-full" />
          </Suspense>
        </div>
      </div>
      <div className="pointer-events-none fixed top-24 right-4 z-10 hidden h-[600px] w-40 2xl:block">
        <div className="pointer-events-auto h-full">
          <Suspense fallback={null}>
            <AdSlot placement="skyscraper-right" className="h-full" />
          </Suspense>
        </div>
      </div>
    </>
  );
}
