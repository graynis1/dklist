"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Real customer report (2026-09-05): "3 resimli ilan girdim ilana tıklayınca
 * resimler alt alta geliyor görüntüsü hoş durmuyor" - every listing photo
 * was just stacked full-width one after another. A real gallery instead:
 * one large image + a thumbnail strip to switch between them, matching
 * how sahibinden.com/trendyol-style listing pages actually show multiple
 * product photos.
 */
export function StoreImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-[3/4] rounded-lg bg-muted" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={alt} className="size-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                i === activeIndex ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
