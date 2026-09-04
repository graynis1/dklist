import { describe, expect, it } from "vitest";
import {
  DUPLICATE_MATCH_THRESHOLD,
  normalizeIsbn,
  normalizeTitle,
  stringSimilarity,
  titleAuthorSimilarity,
} from "./duplicate-detection";

describe("normalizeTitle", () => {
  it("strips edition/print-run noise phrases", () => {
    expect(normalizeTitle("Suç ve Ceza (Özel Baskı)")).toBe("suç ve ceza");
    expect(normalizeTitle("Yüzüklerin Efendisi Cilt 2")).toBe("yüzüklerin efendisi");
    expect(normalizeTitle("Simyacı - Genişletilmiş Baskı")).toBe("simyacı");
  });

  it("strips parenthetical and bracketed remarks", () => {
    expect(normalizeTitle("1984 (2. Baskı)")).toBe("1984");
    expect(normalizeTitle("Küçük Prens [Resimli]")).toBe("küçük prens");
  });

  it("drops bare standalone volume/edition numbers but keeps meaningful digits", () => {
    expect(normalizeTitle("Harry Potter 7")).toBe("harry potter");
  });

  it("does not strip a title that is entirely numeric down to nothing (real book: 1984)", () => {
    expect(normalizeTitle("1984")).toBe("1984");
    expect(normalizeTitle("1984 (2. Baskı)")).toBe("1984");
  });

  it("is case-insensitive with Turkish-specific casing (İ/I/ı/i)", () => {
    expect(normalizeTitle("İSTANBUL Hatırası")).toBe(normalizeTitle("istanbul hatırası"));
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeTitle("Suç,   ve---Ceza!!!")).toBe("suç ve ceza");
  });

  it("two differently-labeled editions of the same work normalize identically", () => {
    const a = normalizeTitle("Suç ve Ceza (Özel Baskı, Ciltli)");
    const b = normalizeTitle("suç ve ceza");
    expect(a).toBe(b);
  });
});

describe("stringSimilarity (Jaro-Winkler)", () => {
  it("scores identical strings as 1", () => {
    expect(stringSimilarity("simyacı", "simyacı")).toBe(1);
  });

  it("scores completely different strings low", () => {
    expect(stringSimilarity("simyacı", "1984")).toBeLessThan(0.5);
  });

  it("boosts strings sharing a common prefix over an equivalent non-prefix difference", () => {
    const prefixShared = stringSimilarity("dostoyevski", "dostoyevska");
    const noPrefixShared = stringSimilarity("adostoyevski", "bdostoyevska");
    expect(prefixShared).toBeGreaterThan(noPrefixShared);
  });

  it("handles empty strings without throwing", () => {
    expect(stringSimilarity("", "")).toBe(1);
    expect(stringSimilarity("", "a")).toBe(0);
  });
});

describe("titleAuthorSimilarity", () => {
  it("scores an exact title+author match at (near) 1", () => {
    const score = titleAuthorSimilarity("Suç ve Ceza", ["Dostoyevski"], "Suç ve Ceza", ["Dostoyevski"]);
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });

  it("treats whole-word author-name containment as a near-match, not a poor string-distance score", () => {
    const score = titleAuthorSimilarity(
      "Suç ve Ceza",
      ["Dostoyevski"],
      "Suç ve Ceza",
      ["Fyodor Dostoyevski"],
    );
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });

  it("short-circuits on title alone when titles clearly differ, without scoring authors", () => {
    const score = titleAuthorSimilarity("1984", ["George Orwell"], "Simyacı", ["Paulo Coelho"]);
    expect(score).toBeLessThan(0.5);
  });

  it("falls back to the title score alone when either side has no author data", () => {
    const titleOnly = stringSimilarity(normalizeTitle("Simyacı"), normalizeTitle("Simyacı"));
    const score = titleAuthorSimilarity("Simyacı", [], "Simyacı", []);
    expect(score).toBe(titleOnly);
  });

  it("scores a genuinely different author for a matching title below the duplicate threshold", () => {
    const score = titleAuthorSimilarity("Simyacı", ["Paulo Coelho"], "Simyacı", ["Someone Else"]);
    expect(score).toBeLessThan(DUPLICATE_MATCH_THRESHOLD);
  });

  // Real catalog rows for a co-authored book routinely list authors in a
  // different order, or with only a subset overlapping (e.g. a translator
  // credit accidentally included on one side) - the double loop over every
  // (authorsA, authorsB) pair must still find the correct match regardless
  // of position, not just compare index-for-index.
  it("finds the matching author pair in a multi-author list regardless of listing order", () => {
    const score = titleAuthorSimilarity(
      "Sineklerin Tanrısı",
      ["Translator Adı", "William Golding"],
      "Sineklerin Tanrısı",
      ["William Golding", "Başka Çevirmen"],
    );
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });

  it("a single genuinely matching author among several unrelated ones still scores as a duplicate", () => {
    const score = titleAuthorSimilarity(
      "Simyacı",
      ["Paulo Coelho"],
      "Simyacı",
      ["Rastgele Bir Kişi", "Alakasız Yazar", "Paulo Coelho"],
    );
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });

  it("no author pair matching among several still scores below the duplicate threshold, not an average", () => {
    const score = titleAuthorSimilarity(
      "Simyacı",
      ["Paulo Coelho"],
      "Simyacı",
      ["Rastgele Bir Kişi", "Alakasız Yazar"],
    );
    expect(score).toBeLessThan(DUPLICATE_MATCH_THRESHOLD);
  });

  it("is case-insensitive with Turkish-specific casing on the author leg too, not just the title", () => {
    const score = titleAuthorSimilarity("İstanbul Hatırası", ["ORHAN PAMUK"], "istanbul hatırası", ["orhan pamuk"]);
    expect(score).toBeGreaterThanOrEqual(DUPLICATE_MATCH_THRESHOLD);
  });
});

describe("normalizeIsbn", () => {
  it("canonicalizes a valid ISBN-10 to its ISBN-13 equivalent", () => {
    // The Hobbit, a real published ISBN-10/ISBN-13 pair.
    expect(normalizeIsbn("0261102214")).toBe("9780261102217");
  });

  it("accepts the same book's hyphenated ISBN-13 form and normalizes identically", () => {
    expect(normalizeIsbn("978-0-261-10221-7")).toBe("9780261102217");
    expect(normalizeIsbn("0261102214")).toBe(normalizeIsbn("978-0-261-10221-7"));
  });

  it("accepts an ISBN-10 with an X check digit", () => {
    // 0-9752298-0-X is a structurally valid ISBN-10 (check digit X).
    expect(normalizeIsbn("097522980X")).not.toBeNull();
  });

  it("rejects an ISBN with a mistyped/invalid check digit", () => {
    expect(normalizeIsbn("0261102215")).toBeNull(); // last digit changed from the real 4
  });

  it("rejects structurally invalid / non-ISBN garbage", () => {
    expect(normalizeIsbn("not-an-isbn")).toBeNull();
    expect(normalizeIsbn("12345")).toBeNull();
    expect(normalizeIsbn("")).toBeNull();
  });

  it("strips whitespace/punctuation before validating", () => {
    expect(normalizeIsbn("  0261102214  ")).toBe("9780261102217");
  });
});
