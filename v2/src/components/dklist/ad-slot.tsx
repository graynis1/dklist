import Script from "next/script";
import { auth } from "@/auth";
import { getActiveAd } from "@/db/queries/advertisements";
import { getAdSenseSettings, getAdSenseSlot } from "@/db/queries/adsense";
import { advertisementImageUrl } from "@/lib/image-urls";
import { cn } from "@/lib/utils";

/** Renders nothing for a premium viewer, nothing if no active ad exists
 * for the placement, otherwise a simple image (optionally linked). Reads
 * auth() itself, so callers should wrap it in its own <Suspense> boundary
 * the same way AuthStatus/AdminNavLink do, to keep the rest of the page
 * prerenderable. `contentLanguage` (e.g. a book's `lang`) enables content-
 * language ad targeting - see getActiveAd()'s doc comment. `className`
 * overrides the default full-bleed `mx-auto max-w-3xl px-6` wrapper - pass
 * e.g. `"px-0"` when the slot already sits inside a page's own padded/
 * max-width container instead of a full-bleed section.
 *
 * Real Google AdSense (customer's ask, 2026-09-02) takes priority over the
 * direct/personal ad system when configured for this exact placement
 * (admin-managed, /admin/reklamlar) - checked first since it needs no
 * viewer/language targeting logic of its own (Google's own script picks
 * the actual ad content). Falls through to the existing personal-ad
 * lookup when AdSense isn't enabled or this specific placement has no
 * slot id configured, so every placement keeps working exactly as before
 * until an admin deliberately turns AdSense on for it. */
export async function AdSlot({
  placement,
  contentLanguage,
  className,
}: {
  placement: string;
  contentLanguage?: string;
  className?: string;
}) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  const adsense = await getAdSenseSettings();
  if (adsense.enabled && adsense.publisherId) {
    const slotId = await getAdSenseSlot(placement);
    if (slotId) {
      return (
        <div className={cn("mx-auto max-w-3xl px-6", className)}>
          <Script
            id="adsbygoogle-script"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.publisherId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
          <ins
            className="adsbygoogle block"
            style={{ display: "block" }}
            data-ad-client={adsense.publisherId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <Script id={`adsbygoogle-push-${placement}`} strategy="afterInteractive">
            {`(adsbygoogle = window.adsbygoogle || []).push({});`}
          </Script>
        </div>
      );
    }
  }

  const ad = await getActiveAd(placement, userId, contentLanguage);
  if (!ad) return null;

  // Real bug found via customer report: a flat image with text baked in
  // scales down proportionally with its container - a wide desktop-
  // proportioned banner shrinks its text to near-illegible size on a
  // narrow phone viewport. When a dedicated mobile creative exists
  // (mobile_image, migration 0036), swap to it below the same breakpoint
  // Tailwind's own `sm:` uses (640px) via a real <picture> element - the
  // browser picks the right image itself, no JS/hydration needed. Falls
  // back to just the desktop image at every size when no mobile variant
  // exists yet (every ad created before this feature, or one an admin
  // hasn't bothered to add a mobile version for).
  const image = ad.mobileImage ? (
    <picture>
      <source media="(max-width: 640px)" srcSet={advertisementImageUrl(ad.mobileImage)} />
      <img src={advertisementImageUrl(ad.image)} alt="" className="w-full rounded-lg" />
    </picture>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={advertisementImageUrl(ad.image)} alt="" className="w-full rounded-lg" />
  );

  return (
    <div className={cn("mx-auto max-w-3xl px-6", className)}>
      {ad.linkUrl ? (
        // Routes through /api/ad-click so the advertiser-facing stats page
        // (getAdAdminList's impressions/clicks) counts real clicks, not
        // just impressions.
        <a href={`/api/ad-click/${ad.id}`} target="_blank" rel="noopener noreferrer sponsored">
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}
