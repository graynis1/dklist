import type { ReactNode } from "react";

/**
 * Renders a 5-glyph star display of a v1-style 0-10 score (`book`/`writer`/
 * `translator`.`score` are all averages of 1-10 votes, matching v1's real
 * `GeneralController::score()` and its `<Rate count={10}>` frontend picker -
 * found via a real bug: this used to treat `value` as already 0-5 with no
 * clamping, so any real score above 5 made `"★".repeat(5 - full)` throw
 * (negative repeat count), and scores under 5 rendered as if the scale were
 * 0-5 (e.g. a mediocre 3/10 book showed as a 3/5 - 60% - "above average"
 * display). Halving onto 5 glyphs is a common, well-understood convention
 * for showing a 10-point score as stars, not v1's own visual choice (v1
 * shows a single star icon + "X.X/10" text instead) - kept the 5-glyph shape
 * since every caller already lays out around it, just fixed the scale.
 */
/**
 * Customer (2026-10-01): use the same "★ 9.0 (N oy)" style everywhere -
 * one gold star in front of the number - instead of a 5-glyph bar plus
 * "X.X/10". Callers print the number (and vote count) right after this.
 */
export function StarRating({ value }: { value: number }) {
  return (
    <span className={value > 0 ? "text-amber-500" : "text-muted-foreground/40"} aria-hidden>
      ★
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-heading text-sm font-medium tracking-[0.2em] text-primary uppercase">
      {children}
    </span>
  );
}
