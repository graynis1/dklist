import { describe, expect, it } from "vitest";
import { translateCategoryName } from "./category-names";

describe("translateCategoryName", () => {
  it("translates a known Library-of-Congress heading to its Turkish equivalent", () => {
    expect(translateCategoryName("Fiction")).toBe("Kurgu");
    expect(translateCategoryName("History")).toBe("Tarih");
  });

  it("translates a known multi-word heading", () => {
    expect(translateCategoryName("Politics and government")).toBe("Siyaset ve Yönetim");
  });

  it("falls back to the raw English text for an unmapped heading", () => {
    expect(translateCategoryName("Some Obscure LoC Heading")).toBe("Some Obscure LoC Heading");
  });

  it("is exact-match only, not case-insensitive (matches the map's own key casing)", () => {
    expect(translateCategoryName("fiction")).toBe("fiction");
  });
});
