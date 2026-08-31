"use client";

import { useState, type ReactNode } from "react";

/**
 * A plain <img> that swaps to `fallback` on load failure - the same
 * onError-swap pattern PhotoBookCover uses for book covers, generalized so
 * every other "real photo, typeset/branded fallback" spot (blog covers,
 * feed post images) doesn't need its own bespoke client component. A
 * missing/404 image should never show the browser's broken-image icon.
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
