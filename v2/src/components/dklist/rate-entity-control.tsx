"use client";

import { useState, useTransition } from "react";

/**
 * Generic 1-5 star picker for any rateable entity (writer/translator) -
 * same interaction as RateBookControl, parameterized over a server action
 * instead of duplicated per entity type.
 */
export function RateEntityControl({
  signedIn,
  initialUserRating,
  rateAction,
}: {
  signedIn: boolean;
  initialUserRating: number | null;
  // Pre-bound server action (rateWriterAction.bind(null, writerId, writerSlug))
  // - keeps this component generic over which entity is being rated without
  // needing to thread id/slug through a wider prop signature.
  rateAction: (value: number) => Promise<{ status: boolean }>;
}) {
  const [rating, setRating] = useState(initialUserRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!signedIn) return null;

  function pick(value: number) {
    const previous = rating;
    setRating(value);
    startTransition(async () => {
      const result = await rateAction(value);
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
