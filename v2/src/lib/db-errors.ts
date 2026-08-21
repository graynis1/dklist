/**
 * drizzle/mysql2 wraps the real driver error inside `.cause` (its own
 * top-level message is just "Failed query: insert into ..."), so any code
 * checking `err.message` alone for "Duplicate entry" never actually
 * matches - a real bug caught via testing (a second same-day daily-visit
 * point award 500'd instead of silently no-op'ing, because this exact
 * check pattern existed in three different files and none of them ever
 * triggered). Walks the cause chain and also checks mysql2's own
 * `code: "ER_DUP_ENTRY"`, more robust than string-matching a message a
 * driver upgrade could reword.
 */
export function isDuplicateKeyError(err: unknown, constraintName?: string): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth++) {
    const e = current as { message?: string; code?: string; cause?: unknown };
    if (e.code === "ER_DUP_ENTRY") return true;
    if (e.message?.includes("Duplicate entry")) return true;
    if (constraintName && e.message?.includes(constraintName)) return true;
    current = e.cause;
  }
  return false;
}
