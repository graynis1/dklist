import { describe, expect, it } from "vitest";
import { languageName } from "./languages";

describe("languageName", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(languageName(null)).toBeNull();
    expect(languageName(undefined)).toBeNull();
    expect(languageName("")).toBeNull();
  });

  it("returns null for whitespace-only input, matching the empty-string case", () => {
    expect(languageName("   ")).toBeNull();
  });

  it("maps known ISO 639-1-ish codes to their Turkish name", () => {
    expect(languageName("tr")).toBe("Türkçe");
    expect(languageName("en")).toBe("İngilizce");
    expect(languageName("ja")).toBe("Japonca");
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(languageName("TR")).toBe("Türkçe");
    expect(languageName("En")).toBe("İngilizce");
    expect(languageName("  tr  ")).toBe("Türkçe");
  });

  it("maps the 'und' (undetermined) code to its own explicit label rather than falling back", () => {
    expect(languageName("und")).toBe("Bilinmiyor");
  });

  it("falls back to the raw code uppercased for anything not in the table", () => {
    expect(languageName("xx")).toBe("XX");
    expect(languageName("klingon")).toBe("KLINGON");
  });

  it("trims and uppercases the normalized code on fallback, not a raw copy with surrounding whitespace", () => {
    // Real bug found while writing this test: the fallback used to return
    // `code.toUpperCase()` (the raw, untrimmed input) instead of the already
    // trim()+toLowerCase()'d `normalized` value, so a code with surrounding
    // whitespace fell back to an uppercased string that still had the
    // whitespace in it (e.g. "  Xx  " -> "  XX  " instead of "XX").
    expect(languageName("  Xx  ")).toBe("XX");
  });
});
