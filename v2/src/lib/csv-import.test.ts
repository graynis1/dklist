import { describe, expect, it } from "vitest";
import { mapGoodreadsShelf, parseCsv, parseGoodreadsExport } from "./csv-import";

describe("parseCsv", () => {
  it("splits a plain comma-separated row", () => {
    expect(parseCsv("a,b,c\n")).toEqual([["a", "b", "c"]]);
  });

  it("parses multiple rows", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("keeps a comma inside a quoted field intact rather than splitting on it", () => {
    expect(parseCsv('"Title, With Comma",Author\n')).toEqual([["Title, With Comma", "Author"]]);
  });

  it("keeps an embedded newline inside a quoted field intact", () => {
    expect(parseCsv('"Line one\nLine two",Author\n')).toEqual([["Line one\nLine two", "Author"]]);
  });

  it("unescapes a doubled quote as a single literal quote", () => {
    expect(parseCsv('"She said ""hi""",Author\n')).toEqual([['She said "hi"', "Author"]]);
  });

  it("handles CRLF line endings the same as bare LF", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("captures a trailing row that has no terminating newline", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("drops rows that are entirely blank", () => {
    expect(parseCsv("a,b\n\n\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseGoodreadsExport", () => {
  const header = "Title,Author,Exclusive Shelf\n";

  it("maps rows by header name regardless of column order", () => {
    const csv = 'Exclusive Shelf,Author,Title\nread,Orwell,1984\n';
    expect(parseGoodreadsExport(csv)).toEqual([{ title: "1984", author: "Orwell", shelf: "read" }]);
  });

  it("parses a normal multi-row export", () => {
    const csv = header + "1984,George Orwell,read\nDune,Frank Herbert,to-read\n";
    expect(parseGoodreadsExport(csv)).toEqual([
      { title: "1984", author: "George Orwell", shelf: "read" },
      { title: "Dune", author: "Frank Herbert", shelf: "to-read" },
    ]);
  });

  it("returns an empty array when the file has no data rows", () => {
    expect(parseGoodreadsExport(header)).toEqual([]);
    expect(parseGoodreadsExport("")).toEqual([]);
  });

  it("returns an empty array when the Title or Author column is missing", () => {
    expect(parseGoodreadsExport("Author,Exclusive Shelf\nOrwell,read\n")).toEqual([]);
    expect(parseGoodreadsExport("Title,Exclusive Shelf\n1984,read\n")).toEqual([]);
  });

  it("defaults shelf to an empty string when the Exclusive Shelf column is absent", () => {
    expect(parseGoodreadsExport("Title,Author\n1984,Orwell\n")).toEqual([
      { title: "1984", author: "Orwell", shelf: "" },
    ]);
  });

  it("filters out rows with no title even if other columns are present", () => {
    const csv = header + ",Some Author,read\nDune,Frank Herbert,to-read\n";
    expect(parseGoodreadsExport(csv)).toEqual([{ title: "Dune", author: "Frank Herbert", shelf: "to-read" }]);
  });
});

describe("mapGoodreadsShelf", () => {
  it("maps all three real Goodreads shelf values to this app's reading-status enum", () => {
    expect(mapGoodreadsShelf("read")).toBe("finishRead");
    expect(mapGoodreadsShelf("currently-reading")).toBe("currentRead");
    expect(mapGoodreadsShelf("to-read")).toBe("targetRead");
  });

  it("returns null for a custom/unmapped shelf name rather than guessing", () => {
    expect(mapGoodreadsShelf("favorites")).toBeNull();
    expect(mapGoodreadsShelf("")).toBeNull();
  });
});
