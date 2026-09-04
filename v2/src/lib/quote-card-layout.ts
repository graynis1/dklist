// Pure text-layout math extracted from QuoteCard
// (src/components/dklist/quote-card.tsx) - the Canvas-2D "alıntı görsel
// paylaşım kartı" share card. The component itself can't be unit-tested
// directly (it needs a real <canvas> to call ctx.measureText), so this
// module takes the actual measuring function as a plain callback instead of
// a CanvasRenderingContext2D - the word-wrap and shrink-to-fit ALGORITHM is
// exactly what QuoteCard's own `draw()` used to do inline, just parameterized
// so it's testable with a fake measurer instead of a real browser canvas.

/**
 * Greedily wraps `text` into lines no wider than `maxWidth`, per
 * `measureWidth`. Splits only on whitespace - never breaks a single word
 * mid-word, matching the original inline `wrapText()` this replaces (a word
 * wider than `maxWidth` on its own still gets its own line rather than being
 * hyphenated or clipped).
 */
export function wrapTextLines(
  text: string,
  maxWidth: number,
  measureWidth: (line: string) => number,
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measureWidth(test) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface QuoteCardLayoutOptions {
  /** Max line width in canvas px, same units `measureWidthAtFontSize` returns. */
  maxWidth: number;
  /** Total vertical px the wrapped block must fit inside. */
  boxHeight: number;
  initialFontSize: number;
  /** Shrinking never goes below this, even if the text still overflows `boxHeight`. */
  minFontSize: number;
  /** px subtracted from the font size on each shrink iteration. */
  fontStep: number;
  /** Line height as a multiple of font size (the original inline code used 1.35). */
  lineHeightRatio: number;
}

export interface QuoteCardLayout {
  fontSize: number;
  lines: string[];
  lineHeight: number;
  totalHeight: number;
}

/**
 * Wraps `text` at `options.initialFontSize`, then repeatedly shrinks the
 * font (re-wrapping each time, since a smaller font changes where lines
 * break) until the wrapped block's total height fits `options.boxHeight` or
 * `options.minFontSize` is reached - whichever comes first. Mirrors the
 * original `draw()`'s inline `while (...) { fontSize -= 4; ... }` loop
 * exactly, including the "give up and use minFontSize" behavior for a quote
 * too long to ever fit.
 */
export function layoutQuoteText(
  text: string,
  measureWidthAtFontSize: (line: string, fontSize: number) => number,
  options: QuoteCardLayoutOptions,
): QuoteCardLayout {
  const { maxWidth, boxHeight, initialFontSize, minFontSize, fontStep, lineHeightRatio } = options;

  let fontSize = initialFontSize;
  let lines = wrapTextLines(text, maxWidth, (line) => measureWidthAtFontSize(line, fontSize));

  while (lines.length * (fontSize * lineHeightRatio) > boxHeight && fontSize > minFontSize) {
    fontSize -= fontStep;
    lines = wrapTextLines(text, maxWidth, (line) => measureWidthAtFontSize(line, fontSize));
  }

  const lineHeight = fontSize * lineHeightRatio;
  return { fontSize, lines, lineHeight, totalHeight: lines.length * lineHeight };
}
