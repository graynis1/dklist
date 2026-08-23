import { describe, expect, it } from "vitest";
import { extractHashtagTags, parseHashtagSegments } from "./hashtag";

describe("parseHashtagSegments", () => {
  it("splits plain text with no hashtags into a single text segment", () => {
    expect(parseHashtagSegments("hiç etiket yok burada")).toEqual([
      { type: "text", value: "hiç etiket yok burada" },
    ]);
  });

  it("extracts a hashtag in the middle of a sentence", () => {
    expect(parseHashtagSegments("harika bir kitap #tavsiye herkese")).toEqual([
      { type: "text", value: "harika bir kitap " },
      { type: "tag", value: "tavsiye" },
      { type: "text", value: " herkese" },
    ]);
  });

  it("supports Turkish letters inside a tag", () => {
    expect(parseHashtagSegments("#çokgüzel")).toEqual([{ type: "tag", value: "çokgüzel" }]);
  });

  it("treats a bare # with nothing after it as plain text, not a tag", () => {
    expect(parseHashtagSegments("fiyat 5 # indirimli")).toEqual([
      { type: "text", value: "fiyat 5 # indirimli" },
    ]);
  });

  it("does not mangle plain bold-black headings with no hashtags", () => {
    const text = "Bölüm 1: Başlangıç";
    expect(parseHashtagSegments(text)).toEqual([{ type: "text", value: text }]);
  });

  it("handles multiple hashtags back to back", () => {
    expect(parseHashtagSegments("#kitap#öneri")).toEqual([
      { type: "tag", value: "kitap" },
      { type: "tag", value: "öneri" },
    ]);
  });

  it("handles an empty string", () => {
    expect(parseHashtagSegments("")).toEqual([]);
  });
});

describe("extractHashtagTags", () => {
  it("returns unique, lowercased tag words", () => {
    expect(extractHashtagTags("#Tavsiye harika, bir daha #tavsiye #BAŞKA")).toEqual([
      "tavsiye",
      "başka",
    ]);
  });

  it("returns an empty array when there are no tags", () => {
    expect(extractHashtagTags("etiket yok")).toEqual([]);
  });

  it("ignores a bare # with nothing after it", () => {
    expect(extractHashtagTags("sadece # işareti")).toEqual([]);
  });
});
