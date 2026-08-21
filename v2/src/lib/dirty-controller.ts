/**
 * v1's DirtyController - checked ONLY on admin-only "add new entity" flows
 * (Book/Writer/Publisher/Translator/Category/Store/Blog/Badge/Youtube add/
 * update) plus UserController::register(). Confirmed by grepping every call
 * site in the real controllers - CommentController never uses this, so
 * comments/quotes deliberately do NOT get this filter; only registerUser()
 * does, since that's the only one of these flows v2 has built so far.
 *
 * Ported as an exact match against a fixed word list, matching v1's actual
 * (slightly naive) implementation: `$text === strtolower($dirty)` checks the
 * whole trimmed field against a lowercased list entry, not a substring/
 * case-insensitive scan - kept faithful rather than "improved", since the
 * task is parity, not a better profanity filter.
 */
const DIRTY_LIST = [
  "sik", "am", "orospu", "ibne", "şerefsiz", "serefsiz", "gavat", "yavşak",
  "yavsak", "ananı", "sikeyim", "sikerler", "ibnenin", "amk", "amına",
  "amına koyayım", "sikiyim", "sikerim", "amı", "salak", "oçocugu",
  "sikinden", "göt", "götün", "götüne", "götüm", "it",
];

export function isDirty(text: string | null | undefined): boolean {
  if (!text) return false;
  return DIRTY_LIST.some((word) => text === word.toLowerCase());
}

/**
 * Eighth item from the "what else could be added" brainstorm list: an
 * auto-flag for comments/replies, which isDirty() above was never meant
 * for - it's an exact-whole-field match (right for a username/name field,
 * useless against a real sentence). This is a genuine substring scan
 * instead, deliberately kept separate from isDirty() rather than changing
 * that function's behavior (which still needs to match v1's registration-
 * field parity exactly). Doesn't block posting - see comments.ts's call
 * sites - just surfaces a match for admin review, same "the action still
 * succeeds, only the follow-up signal changes" shape as every other soft-
 * gate in this app (daily point caps, etc).
 */
export function findFlaggedWords(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  // Single-word list entries are matched as whole tokens, not raw
  // substrings - some entries ("am", "it") are short enough that a plain
  // .includes() would false-positive on completely innocent words
  // ("tamam", "kamera"). \b doesn't reliably tokenize Turkish letters
  // (JS's \w is ASCII-only), so tokenize by hand via \p{L} instead.
  // Multi-word phrase entries ("amına koyayım") stay substring-matched -
  // specific enough as full phrases not to have the same false-positive risk.
  const words = new Set(lower.split(/[^\p{L}]+/u).filter(Boolean));
  return DIRTY_LIST.filter((entry) => {
    const lowerEntry = entry.toLowerCase();
    return lowerEntry.includes(" ") ? lower.includes(lowerEntry) : words.has(lowerEntry);
  });
}
