"use client";

import { useState, useTransition } from "react";
import { rateBookAction } from "@/app/kitap/[slug]/actions";

interface RateBookControlProps {
  bookId: number;
  bookSlug: string;
  signedIn: boolean;
  initialUserRating: number | null;
}

/**
 * Interactive 1-5 star picker - distinct from the read-only <StarRating>
 * used everywhere else to *display* an average. Optimistic: shows the click
 * immediately, reverts on failure.
 */
export function RateBookControl({
  bookId,
  bookSlug,
  signedIn,
  initialUserRating,
}: RateBookControlProps) {
  const [rating, setRating] = useState(initialUserRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) return null;

  function pick(value: number) {
    const previous = rating;
    setRating(value);
    startTransition(async () => {
      const result = await rateBookAction(bookId, bookSlug, value);
      if (!result.status) setRating(previous);
    });
  }

  const display = hovered ?? rating ?? 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Puanınız:</span>
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setHovered(null)}
        aria-disabled={isPending}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={isPending}
            onMouseEnter={() => setHovered(n)}
            onClick={() => pick(n)}
            className="text-lg leading-none disabled:opacity-50"
            aria-label={`${n} yıldız ver`}
          >
            <span className={n <= display ? "text-primary" : "text-muted-foreground/40"}>
              ★
            </span>
          </button>
        ))}
      </div>
      {rating && <span className="text-xs text-muted-foreground">({rating}/5)</span>}
    </div>
  );
}
