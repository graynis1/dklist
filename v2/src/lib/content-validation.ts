/**
 * Shared min/max character-length validation for user-submitted text -
 * comments, replies, feed posts, quotes, book-club names, passwords all
 * duplicated the exact same trim-then-compare-then-throw pair across
 * `src/db/queries/{comments,feed-posts,book-clubs,auth-account,profile}.ts`,
 * each with only the noun ("Yorum"/"Yanıt"/"Gönderi"/"Şifre"/"Kulüp adı")
 * and the bounds differing - a real duplication risk (a limit change, e.g.
 * raising the 2000-char comment cap, would need to be found and applied in
 * every one of those call sites to actually take effect everywhere the
 * schema's `TEXT`/`VARCHAR` column allows).
 *
 * Deliberately takes the already-processed string rather than doing its own
 * trimming - callers that need the trimmed value afterward (for moderation
 * checks, hashtag notification, or the DB insert itself) trim once
 * themselves, and a password's length is intentionally checked on the raw
 * value (trimming a password before a length check would silently accept a
 * shorter real password than the user typed).
 */
export interface ContentLengthBounds {
  min?: number;
  max?: number;
}

export function assertContentLength(value: string, noun: string, bounds: ContentLengthBounds): void {
  if (bounds.min !== undefined && value.length < bounds.min) {
    throw new Error(`${noun} en az ${bounds.min} karakter olmalıdır.`);
  }
  if (bounds.max !== undefined && value.length > bounds.max) {
    throw new Error(`${noun} en fazla ${bounds.max} karakter olabilir.`);
  }
}
