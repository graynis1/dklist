import { describe, expect, it } from "vitest";
import { isDuplicateKeyError } from "./db-errors";

describe("isDuplicateKeyError", () => {
  it("matches mysql2's own ER_DUP_ENTRY code", () => {
    expect(isDuplicateKeyError({ code: "ER_DUP_ENTRY" })).toBe(true);
  });

  it("matches a plain 'Duplicate entry' message", () => {
    expect(
      isDuplicateKeyError({ message: "Duplicate entry '1-2' for key 'uniq_idx'" }),
    ).toBe(true);
  });

  it("does NOT match err.message alone when drizzle wraps the real driver error in .cause", () => {
    // This is the exact real bug db-errors.ts's own file comment documents:
    // drizzle/mysql2's top-level message is just "Failed query: insert into ...",
    // the real driver error lives one level down in .cause.
    const drizzleWrapped = {
      message: "Failed query: insert into `read_purpose` ...",
      cause: { code: "ER_DUP_ENTRY", message: "Duplicate entry '5-2026' for key 'PRIMARY'" },
    };
    expect(isDuplicateKeyError(drizzleWrapped)).toBe(true);
  });

  it("walks multiple levels of .cause, not just one", () => {
    const doublyWrapped = {
      message: "outer",
      cause: {
        message: "middle",
        cause: { code: "ER_DUP_ENTRY" },
      },
    };
    expect(isDuplicateKeyError(doublyWrapped)).toBe(true);
  });

  it("stops walking after 5 levels rather than looping forever on a malformed chain", () => {
    // Build a .cause chain 6 levels deep with the match only at the very bottom -
    // the depth cap means this should NOT be found.
    let chain: { message: string; cause?: unknown } = { message: "level6", cause: { code: "ER_DUP_ENTRY" } };
    for (let i = 5; i >= 1; i--) {
      chain = { message: `level${i}`, cause: chain };
    }
    expect(isDuplicateKeyError(chain)).toBe(false);
  });

  it("matches an explicit constraintName against the message when provided", () => {
    expect(
      isDuplicateKeyError({ message: "some other wording entirely" }, "uniq_reason_key"),
    ).toBe(false);
    expect(
      isDuplicateKeyError({ message: "constraint uniq_reason_key violated" }, "uniq_reason_key"),
    ).toBe(true);
  });

  it("returns false for an unrelated error", () => {
    expect(isDuplicateKeyError(new Error("connection refused"))).toBe(false);
  });

  it("returns false for null/undefined without throwing", () => {
    expect(isDuplicateKeyError(null)).toBe(false);
    expect(isDuplicateKeyError(undefined)).toBe(false);
  });

  it("returns false for a non-object thrown value", () => {
    expect(isDuplicateKeyError("just a string")).toBe(false);
    expect(isDuplicateKeyError(42)).toBe(false);
  });

  it("handles a .cause that is itself null/undefined without throwing", () => {
    expect(isDuplicateKeyError({ message: "no match here", cause: null })).toBe(false);
  });
});
