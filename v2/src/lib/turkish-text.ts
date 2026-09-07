/**
 * Turkish-aware case folding. Plain `String.prototype.toLowerCase()` gets
 * Turkish's dotted/dotless I pairs wrong: `"İ".toLowerCase()` produces "i̇"
 * (a plain "i" plus a combining dot, U+0307), not the intended plain "i",
 * and `"I".toLowerCase()` produces "i" when the correct Turkish lowercase
 * form is "ı" (dotless). Originally inline in `duplicate-detection.ts`
 * (title normalization needs this so "İSTANBUL" and "istanbul" compare
 * equal) - extracted here so anything else doing Turkish-text comparison in
 * JS (as opposed to letting MySQL's own locale-aware `LOWER()` handle it,
 * the fix already used for search - see PLAN.md's writer/publisher/
 * translator search note) can reuse the same correct behavior instead of
 * re-deriving it.
 */
const TURKISH_UPPER_TO_LOWER: Record<string, string> = {
  İ: "i",
  I: "ı",
};

export function turkishLowercase(s: string): string {
  return s.replace(/[İI]/g, (c) => TURKISH_UPPER_TO_LOWER[c] ?? c).toLowerCase();
}
