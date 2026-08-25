import { describe, expect, it } from "vitest";
import { containsPattern, escapeLikePattern, prefixPattern } from "./sql-like";

describe("escapeLikePattern", () => {
  it("escapes a literal percent sign", () => {
    expect(escapeLikePattern("50%")).toBe("50\\%");
  });

  it("escapes a literal underscore", () => {
    expect(escapeLikePattern("under_score")).toBe("under\\_score");
  });

  it("escapes a literal backslash", () => {
    expect(escapeLikePattern("C:\\books")).toBe("C:\\\\books");
  });

  it("escapes multiple metacharacters in one string", () => {
    expect(escapeLikePattern("100%_off\\sale")).toBe("100\\%\\_off\\\\sale");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("Fahrenheit 451")).toBe("Fahrenheit 451");
  });

  it("leaves Turkish characters untouched", () => {
    expect(escapeLikePattern("İletişim Yayınları")).toBe("İletişim Yayınları");
  });

  it("handles an empty string", () => {
    expect(escapeLikePattern("")).toBe("");
  });

  it("does not double-escape when a backslash and a wildcard are adjacent", () => {
    // A single left-to-right pass over the original string, not a chain of
    // separate replaces, so escaping the backslash never re-escapes the
    // backslash a later step just inserted for the '%'.
    expect(escapeLikePattern("\\%")).toBe("\\\\\\%");
  });
});

describe("containsPattern", () => {
  it("wraps the escaped term in leading/trailing wildcards", () => {
    expect(containsPattern("50%")).toBe("%50\\%%");
  });

  it("matches the term literally, not as a wildcard, in a real LIKE check", () => {
    // "50% Chance" contains a literal '%' - a naive `%${term}%` pattern for
    // the search term "50%" would still happen to match here, so also
    // confirm the escaped pattern does NOT match unrelated text that a
    // broadened '%' wildcard would incorrectly pull in.
    const pattern = containsPattern("50%");
    const likeRegex = likePatternToRegExp(pattern);
    expect(likeRegex.test("50% Chance")).toBe(true);
    expect(likeRegex.test("50 percent off, whatever the discount")).toBe(false);
  });
});

describe("prefixPattern", () => {
  it("wraps the escaped term with only a trailing wildcard", () => {
    expect(prefixPattern("under_score")).toBe("under\\_score%");
  });

  it("matches only a real prefix, not any single character standing in for '_'", () => {
    const pattern = prefixPattern("under_score");
    const likeRegex = likePatternToRegExp(pattern);
    expect(likeRegex.test("under_score books")).toBe(true);
    expect(likeRegex.test("underXscore books")).toBe(false);
  });
});

/** Minimal LIKE-pattern-to-RegExp translator, test-only: mirrors MySQL's
 * default backslash-escaped LIKE semantics closely enough to assert the
 * patterns above behave as intended without needing a real database. */
function likePatternToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (c === "%") {
      out += ".*";
    } else if (c === "_") {
      out += ".";
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`, "s");
}
