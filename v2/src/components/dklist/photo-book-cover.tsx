"use client";

import { useState, type ReactNode } from "react";

/**
 * Isolated client-only piece of BookCover - just the real photo + its onError
 * fallback. Split into its own "use client" file so the rest of book-cover.tsx
 * (including the toneForId() utility every Server Component calls directly)
 * stays a plain, server-callable module. `fallback` is the already-rendered
 * typeset jacket JSX, built server-side by the caller - swapped in on a real
 * image-load failure without needing its own client-side re-render logic.
 */
export function PhotoBookCover({
  src,
  alt,
  wrapperClassName,
  rotate,
  fallback,
}: {
  src: string;
  alt: string;
  wrapperClassName: string;
  rotate: number;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;

  return (
    <div className={wrapperClassName} style={{ transform: `rotate(${rotate}deg)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
