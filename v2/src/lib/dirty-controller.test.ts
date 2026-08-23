import { describe, expect, it } from "vitest";
import { findFlaggedWords, isDirty } from "./dirty-controller";

describe("isDirty (exact-whole-field match, v1 parity)", () => {
  it("matches a whole field equal to a listed word", () => {
    expect(isDirty("salak")).toBe(true);
  });

  it("does not match a word merely containing a listed entry as a substring", () => {
    // Deliberate v1 parity: this is an exact-match filter, not a substring scan.
    expect(isDirty("salaklar")).toBe(false);
  });

  it("is case-sensitive to the listed (lowercase) entries, matching v1's raw ===", () => {
    expect(isDirty("Salak")).toBe(false);
  });

  it("does not match a clean field", () => {
    expect(isDirty("kitapsever")).toBe(false);
  });

  it("handles null/undefined/empty input without throwing", () => {
    expect(isDirty(null)).toBe(false);
    expect(isDirty(undefined)).toBe(false);
    expect(isDirty("")).toBe(false);
  });

  it("matches a multi-word listed phrase exactly", () => {
    expect(isDirty("amına koyayım")).toBe(true);
  });
});

describe("findFlaggedWords (whole-word substring scan for free-text bodies)", () => {
  it("flags a short listed word only as a whole token, not inside an innocent word", () => {
    expect(findFlaggedWords("tamam anladım")).toEqual([]);
    expect(findFlaggedWords("kamerayı aç")).toEqual([]);
  });

  it("flags a short listed word when it appears as its own token", () => {
    expect(findFlaggedWords("bu adam tam bir it")).toContain("it");
  });

  it("flags a multi-word phrase via substring match", () => {
    expect(findFlaggedWords("aa amına koyayım bb")).toContain("amına koyayım");
  });

  it("returns an empty array for clean text", () => {
    expect(findFlaggedWords("bu kitabı çok sevdim, harika bir eser")).toEqual([]);
  });

  it("handles null/undefined/empty input without throwing", () => {
    expect(findFlaggedWords(null)).toEqual([]);
    expect(findFlaggedWords(undefined)).toEqual([]);
    expect(findFlaggedWords("")).toEqual([]);
  });

  it("is case-insensitive, unlike isDirty", () => {
    expect(findFlaggedWords("SALAK bir yorum")).toContain("salak");
  });
});
