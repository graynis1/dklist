import { describe, expect, it } from "vitest";
import { layoutQuoteText, wrapTextLines } from "./quote-card-layout";

// A simple, deterministic stand-in for ctx.measureText(s).width: width is
// just character count, so maxWidth reads naturally as "N characters per line".
const charWidth = (s: string) => s.length;

describe("wrapTextLines", () => {
  it("keeps short text on a single line", () => {
    expect(wrapTextLines("kısa bir alıntı", 100, charWidth)).toEqual(["kısa bir alıntı"]);
  });

  it("wraps onto multiple lines once a line would exceed maxWidth", () => {
    // "bir iki uc" = 10 chars > maxWidth 9, so "uc" moves to its own line.
    expect(wrapTextLines("bir iki uc", 9, charWidth)).toEqual(["bir iki", "uc"]);
  });

  it("never breaks a single word, even one wider than maxWidth on its own", () => {
    expect(wrapTextLines("kısa birrrrrrrrrrrrrrrrr uzun", 10, charWidth)).toEqual([
      "kısa",
      "birrrrrrrrrrrrrrrrr",
      "uzun",
    ]);
  });

  it("collapses repeated/mixed whitespace between words", () => {
    expect(wrapTextLines("bir   iki\tuc\nfour", 100, charWidth)).toEqual(["bir iki uc four"]);
  });

  it("returns an empty array for empty or whitespace-only text", () => {
    expect(wrapTextLines("", 100, charWidth)).toEqual([]);
    expect(wrapTextLines("   ", 100, charWidth)).toEqual([]);
  });

  it("does not wrap when a line is exactly maxWidth (boundary is exclusive)", () => {
    // "1234567890" is exactly 10 chars.
    expect(wrapTextLines("1234567890", 10, charWidth)).toEqual(["1234567890"]);
  });

  it("trims a single trailing/leading space around words correctly", () => {
    expect(wrapTextLines("  bir iki  ", 100, charWidth)).toEqual(["bir iki"]);
  });
});

describe("layoutQuoteText", () => {
  const baseOptions = {
    maxWidth: 40,
    boxHeight: 200,
    initialFontSize: 20,
    minFontSize: 8,
    fontStep: 2,
    lineHeightRatio: 1.35,
  };

  it("uses the initial font size when the text already fits the box", () => {
    const layout = layoutQuoteText("kısa bir alıntı", charWidth, baseOptions);
    expect(layout.fontSize).toBe(20);
    expect(layout.lines).toEqual(["kısa bir alıntı"]);
    expect(layout.lineHeight).toBeCloseTo(20 * 1.35);
    expect(layout.totalHeight).toBeCloseTo(layout.lines.length * layout.lineHeight);
  });

  it("shrinks the font size until the wrapped block fits boxHeight", () => {
    // A long quote that wraps into many lines at fontSize 20 (width scales
    // with fontSize, so it wraps into fewer/shorter lines as it shrinks).
    const longQuote =
      "Bu uzun bir alıntı metni gerçekten kartın sığdırabileceğinden daha fazla satıra ihtiyaç duyacak kadar uzun olmalı ki küçültme mantığı devreye girsin";
    const measure = (line: string, fontSize: number) => line.length * (fontSize / 20);

    // At fontSize 20 this wraps to 4 lines (height 108); a boxHeight of 80
    // forces two shrink steps down to fontSize 14 (3 lines, height 56.7) -
    // verified by hand against wrapTextLines below, not just asserted blind.
    const layout = layoutQuoteText(longQuote, measure, { ...baseOptions, boxHeight: 80 });

    expect(layout.fontSize).toBe(14);
    // Must have actually shrunk from the initial size, and stay within bounds.
    expect(layout.fontSize).toBeLessThan(20);
    expect(layout.fontSize).toBeGreaterThanOrEqual(8);
    expect((layout.fontSize - 8) % 2).toBe(0); // only ever steps by fontStep
    // Re-wrapping at the returned fontSize with the same measurer must
    // reproduce exactly the lines returned (no stale wrap from a stale size).
    expect(wrapTextLines(longQuote, baseOptions.maxWidth, (l) => measure(l, layout.fontSize))).toEqual(
      layout.lines,
    );
  });

  it("stops at minFontSize rather than shrinking forever when text can never fit", () => {
    const impossiblyLong = Array.from({ length: 50 }, (_, i) => `kelime${i}`).join(" ");
    const measure = (line: string) => line.length; // width doesn't shrink with font at all
    const layout = layoutQuoteText(impossiblyLong, measure, {
      ...baseOptions,
      boxHeight: 10, // tiny box, guaranteed to never fit
    });
    expect(layout.fontSize).toBe(baseOptions.minFontSize);
  });

  it("computes lineHeight and totalHeight from the returned fontSize, not the initial one", () => {
    const measure = (line: string, fontSize: number) => line.length * (fontSize / 20);
    const layout = layoutQuoteText("bir iki uc dort bes alti yedi sekiz dokuz on", measure, {
      ...baseOptions,
      maxWidth: 15,
      boxHeight: 60,
    });
    expect(layout.lineHeight).toBeCloseTo(layout.fontSize * baseOptions.lineHeightRatio);
    expect(layout.totalHeight).toBeCloseTo(layout.lines.length * layout.lineHeight);
  });
});
