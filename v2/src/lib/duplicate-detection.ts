/**
 * Phase 5 classical duplicate-detection primitives (PLAN.md's 5-stage list,
 * stages 1-3 - stage 4/AI-review is explicitly out of scope until the
 * no-paid-services/self-hosted-model question is resolved, stage 5's manual
 * approval panel already exists at /admin/merge). Pure functions only here -
 * deliberately NOT wired into any full-table scan against the real ~98.5M-row
 * `book` table yet. That table has no index on `isbn` (confirmed via a
 * read-only prod check), so even an exact-match GROUP BY would be a full
 * table scan on HDD-backed storage - exactly the class of operation that
 * killed the FULLTEXT index attempts twice already. A real bulk dry-run
 * needs its own indexing + batching design pass first, matching PLAN.md's
 * own caution that the backfill "must be batched/chunked... treat it as its
 * own risk item, not an incidental migration step" - not something to rush
 * into inside an unrelated work session.
 */

// Edition/print-run noise phrases that show up inside book titles without
// being part of the actual work title - stripped (as phrases, since several
// are multi-word) before comparing. Order matters: longer phrases first so
// e.g. "özel baskı" is removed whole rather than leaving a stray "baskı".
const EDITION_NOISE_PHRASES = [
  "özel baskı",
  "karton kapak",
  "tam metin",
  "genişletilmiş baskı",
  "ciltli",
  "cilt",
  "baskı",
  "basım",
  "eksiksiz",
  "resimli",
];

const TURKISH_LOWER_MAP: Record<string, string> = {
  İ: "i",
  I: "ı",
};

function turkishLowercase(s: string): string {
  return s.replace(/[İI]/g, (c) => TURKISH_LOWER_MAP[c] ?? c).toLowerCase();
}

/**
 * Strips case, punctuation, parenthetical edition remarks (e.g. "(2. Baskı)"),
 * standalone volume/edition numbers ("Cilt 2", "2. Baskı"), and the noise
 * phrase list above, then collapses whitespace. Two editions of the same
 * work with different print-run labels should normalize to the same key
 * even though their raw titles differ.
 */
export function normalizeTitle(title: string): string {
  let t = turkishLowercase(title.trim());
  t = t.replace(/\([^)]*\)/g, " "); // parenthetical remarks
  t = t.replace(/\[[^\]]*\]/g, " "); // bracketed remarks
  for (const phrase of EDITION_NOISE_PHRASES) {
    // Word-boundary-aware, not a raw substring replace: a plain replaceAll
    // would also strip "baskı" out of an unrelated real word like
    // "Basımevi" (a title about printing-house history), silently eating
    // meaningful title content instead of just the edition-noise phrase.
    // \p{L}/\p{N} lookaround (not \b, which doesn't understand Turkish
    // letters) ensures the phrase is only stripped as a standalone token.
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${phrase}(?![\\p{L}\\p{N}])`, "gu"), " ");
  }
  t = t.replace(/[^\p{L}\p{N}\s]/gu, " "); // punctuation -> space (unicode-aware)
  const tokens = t.split(/\s+/).filter(Boolean).filter((tok) => !/^\d+$/.test(tok)); // bare volume/edition numbers
  return tokens.join(" ").trim();
}

/** Standard Jaro similarity (0-1). */
function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(aLen, bLen) / 2) - 1);
  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  return (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;
}

/** Jaro-Winkler: boosts the Jaro score for strings sharing a common prefix
 * (up to 4 chars), which fits book titles well - a truncated/expanded
 * subtitle after a shared main title should still score high. */
export function stringSimilarity(a: string, b: string): number {
  const base = jaro(a, b);
  let prefixLen = 0;
  const maxPrefix = Math.min(4, a.length, b.length);
  while (prefixLen < maxPrefix && a[prefixLen] === b[prefixLen]) prefixLen++;
  return base + prefixLen * 0.1 * (1 - base);
}

/** Combined title+author fuzzy score - both normalized titles AND at least
 * one shared/similar author name are required, matching PLAN.md's
 * "title+author fuzzy similarity" stage (title alone is too weak a signal
 * across 98.5M books - many unrelated books share generic titles). */
export function titleAuthorSimilarity(
  titleA: string,
  authorsA: string[],
  titleB: string,
  authorsB: string[],
): number {
  const titleScore = stringSimilarity(normalizeTitle(titleA), normalizeTitle(titleB));
  if (titleScore < 0.8) return titleScore; // don't bother scoring authors if titles already don't match

  let bestAuthorScore = 0;
  for (const a of authorsA) {
    for (const b of authorsB) {
      const normA = turkishLowercase(a.trim());
      const normB = turkishLowercase(b.trim());
      // Common real-world variant: "Dostoyevski" vs "Fyodor Dostoyevski" -
      // a straight Jaro-Winkler comparison scores this poorly since the
      // extra first name shifts the whole alignment, even though it's
      // obviously the same person. Whole-word containment is treated as a
      // near-exact match instead of falling through to string distance.
      const aWords = normA.split(/\s+/);
      const bWords = normB.split(/\s+/);
      const contained = aWords.every((w) => bWords.includes(w)) || bWords.every((w) => aWords.includes(w));
      const score = contained ? 0.97 : stringSimilarity(normA, normB);
      if (score > bestAuthorScore) bestAuthorScore = score;
    }
  }
  if (authorsA.length === 0 || authorsB.length === 0) return titleScore; // no author data to cross-check - fall back to title alone
  return titleScore * 0.7 + bestAuthorScore * 0.3;
}

export const DUPLICATE_MATCH_THRESHOLD = 0.95;

/**
 * ISBN check-digit validation + ISBN-10 -> ISBN-13 conversion, so stage 1
 * ("ISBN exact match") can compare the same book's ISBN-10 and ISBN-13
 * listings as equal instead of missing them as a raw-string mismatch - a
 * real gap in `book.isbn` (a free-text `varchar(50)`, confirmed via
 * `schema.ts`, not a normalized/indexed identifier): the same real-world
 * book routinely has an ISBN-10 row from an older edition and an ISBN-13
 * row from a newer one, plus hyphens/spaces in either format depending on
 * how the data was originally entered.
 */

function isbn10CheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(digits[i]);
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

function isbn13CheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * Number(digits[i]);
  const remainder = sum % 10;
  return String(remainder === 0 ? 0 : 10 - remainder);
}

/**
 * Strips everything but digits/`X`, validates the real ISBN-10 or ISBN-13
 * check digit (rejecting malformed/mistyped values rather than treating them
 * as a match key - same "return nothing rather than a false signal" spirit
 * as `normalizeTitle`'s empty-string return), and canonicalizes to ISBN-13
 * (the modern, superset identifier) so an ISBN-10 and its ISBN-13 equivalent
 * normalize to the same key. Returns `null` for anything that isn't a
 * structurally valid ISBN.
 */
export function normalizeIsbn(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^0-9X]/g, "");

  if (cleaned.length === 10) {
    if (!/^\d{9}[\dX]$/.test(cleaned)) return null;
    if (isbn10CheckDigit(cleaned) !== cleaned[9]) return null;
    const core = "978" + cleaned.slice(0, 9);
    return core + isbn13CheckDigit(core);
  }

  if (cleaned.length === 13) {
    if (!/^\d{13}$/.test(cleaned)) return null;
    if (isbn13CheckDigit(cleaned) !== cleaned[12]) return null;
    return cleaned;
  }

  return null;
}
