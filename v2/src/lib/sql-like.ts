/**
 * Escapes MySQL LIKE metacharacters (`%`, `_`) plus the escape character
 * itself (`\`) in user-supplied search text. Every search box across this
 * app (books, writers, translators, publishers, categories, users, blog,
 * badges, book clubs, newsletter subscribers, admin lists) builds a LIKE
 * pattern by directly wrapping the raw search term (`%${term}%` or
 * `${term}%`) - a real, reproducible bug: typing a literal "%" or "_"
 * (e.g. searching for the book "50% Chance" or a username containing an
 * underscore) makes MySQL treat it as a wildcard instead of a literal
 * character, silently broadening or narrowing the match in ways the user
 * never intended. MySQL's LIKE operator escapes with `\` by default (no
 * ESCAPE clause needed) - see
 * https://dev.mysql.com/doc/refman/8.4/en/string-comparison-functions.html
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Builds a `%term%` (substring) LIKE pattern with the term's own
 * metacharacters escaped so they're matched literally. */
export function containsPattern(term: string): string {
  return `%${escapeLikePattern(term)}%`;
}

/** Builds a `term%` (prefix-only) LIKE pattern with the term's own
 * metacharacters escaped so they're matched literally - this app's
 * standard search pattern (see search.ts's own doc comment on why prefix-
 * only, not substring: it can still use a leading B-tree index). */
export function prefixPattern(term: string): string {
  return `${escapeLikePattern(term)}%`;
}
