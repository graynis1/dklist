import { describe, expect, it } from "vitest";
import { turkishLowercase } from "./turkish-text";

describe("turkishLowercase", () => {
  it("lowercases dotted capital İ to plain i, not i + combining dot", () => {
    const result = turkishLowercase("İSTANBUL");
    expect(result).toBe("istanbul");
    expect(result.length).toBe("istanbul".length); // guards against the U+0307 combining-dot bug
  });

  it("lowercases plain capital I to dotless ı, not plain i", () => {
    expect(turkishLowercase("ISPARTA")).toBe("ısparta");
  });

  it("leaves already-lowercase Turkish letters untouched", () => {
    expect(turkishLowercase("istanbul ışık")).toBe("istanbul ışık");
  });

  it("handles mixed Turkish/Latin text with both capital I forms in one string", () => {
    expect(turkishLowercase("İstanbul Işık Kitabevi")).toBe("istanbul ışık kitabevi");
  });

  it("matches plain toLowerCase() for non-Turkish-specific letters", () => {
    expect(turkishLowercase("HARRY POTTER")).toBe("harry potter");
  });

  it("returns an empty string unchanged", () => {
    expect(turkishLowercase("")).toBe("");
  });

  it("makes differently-cased forms of the same Turkish word compare equal", () => {
    expect(turkishLowercase("İZMİR")).toBe(turkishLowercase("izmir"));
    expect(turkishLowercase("İZMİR")).toBe(turkishLowercase("İzmir"));
  });
});
