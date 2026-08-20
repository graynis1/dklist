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
