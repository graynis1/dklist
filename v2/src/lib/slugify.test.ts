import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates plain ASCII words", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("maps Turkish characters before lowercasing, including capital İ", () => {
    // Real bug this ordering fixes: JS's locale-insensitive toLowerCase() turns
    // İ (U+0130) into "i" + a combining dot (U+0307), not plain "i" - mapping
    // Turkish chars first avoids that and prevents a spurious extra hyphen.
    expect(slugify("İletişim Yayınları")).toBe("iletisim-yayinlari");
  });

  it("maps every Turkish special character, upper and lower case", () => {
    expect(slugify("çÇ ğĞ ıİ öÖ şŞ üÜ")).toBe("cc-gg-ii-oo-ss-uu");
  });

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Foo   Bar!!  Baz")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  --Foo Bar--  ")).toBe("foo-bar");
  });

  it("returns an empty string for input with no alphanumeric content", () => {
    expect(slugify("!!!")).toBe("");
  });
});
