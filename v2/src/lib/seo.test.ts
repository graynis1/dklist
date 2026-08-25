import { describe, expect, it } from "vitest";
import { NOINDEX_METADATA, pageMetadata, truncateDescription } from "./seo";

describe("pageMetadata", () => {
  it("builds title/description/canonical and defaults to indexable", () => {
    const meta = pageMetadata({
      title: "Suç ve Ceza",
      description: "Bir Dostoyevski romanı.",
      path: "/kitap/suc-ve-ceza",
    });

    expect(meta.title).toBe("Suç ve Ceza");
    expect(meta.description).toBe("Bir Dostoyevski romanı.");
    expect(meta.alternates).toEqual({ canonical: "/kitap/suc-ve-ceza" });
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("suffixes the site name onto openGraph/twitter titles but not the bare title", () => {
    const meta = pageMetadata({
      title: "Suç ve Ceza",
      description: "Bir Dostoyevski romanı.",
      path: "/kitap/suc-ve-ceza",
    });

    expect(meta.title).toBe("Suç ve Ceza");
    expect(meta.openGraph?.title).toBe("Suç ve Ceza | DKList");
    expect(meta.twitter).toMatchObject({ title: "Suç ve Ceza | DKList" });
  });

  it("sets noIndex robots directive when requested", () => {
    const meta = pageMetadata({
      title: "Profilim",
      description: "Hesap ayarları.",
      path: "/profil/duzenle",
      noIndex: true,
    });

    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("only attaches openGraph images when an image is provided", () => {
    const withoutImage = pageMetadata({
      title: "X",
      description: "Y",
      path: "/x",
    });
    expect(withoutImage.openGraph).not.toHaveProperty("images");

    const withImage = pageMetadata({
      title: "X",
      description: "Y",
      path: "/x",
      image: "/covers/x.png",
    });
    expect(withImage.openGraph?.images).toEqual([{ url: "/covers/x.png" }]);
  });

  it("uses type=website and echoes the path as the openGraph url", () => {
    const meta = pageMetadata({
      title: "X",
      description: "Y",
      path: "/kategori/roman",
    });
    expect(meta.openGraph).toMatchObject({ type: "website", url: "/kategori/roman" });
  });
});

describe("NOINDEX_METADATA", () => {
  it("is a static noindex/nofollow block", () => {
    expect(NOINDEX_METADATA).toEqual({ robots: { index: false, follow: false } });
  });
});

describe("truncateDescription", () => {
  it("returns short text unchanged", () => {
    expect(truncateDescription("Kısa bir açıklama.")).toBe("Kısa bir açıklama.");
  });

  it("collapses internal whitespace/newlines and trims the ends", () => {
    expect(truncateDescription("  bu   metin\n\nboşluklu   ")).toBe("bu metin boşluklu");
  });

  it("truncates long text at the configured max length without cutting mid-word", () => {
    const text = "Bu " + "kelime ".repeat(40) + "son.";
    const result = truncateDescription(text, 40);

    expect(result.endsWith("...")).toBe(true);
    // The word straddling the cutoff (index 40 lands mid-"kelime") must be
    // dropped whole, not sliced - so every full word before "..." is intact.
    const words = result.slice(0, -3).trim().split(" ");
    expect(words.every((w) => text.includes(w))).toBe(true);
    expect(text.slice(0, 40)).not.toBe(result.slice(0, -3));
  });

  it("does not append '...' when the text is exactly at the max length", () => {
    const text = "a".repeat(160);
    expect(truncateDescription(text)).toBe(text);
  });

  it("truncates using the default max of 160 when none is given", () => {
    const text = "kelime ".repeat(40); // 280 chars
    const result = truncateDescription(text);
    expect(result.length).toBeLessThanOrEqual(163);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles a single word longer than max by cutting it (no whitespace to break on)", () => {
    const longWord = "a".repeat(50);
    const result = truncateDescription(longWord, 10);
    expect(result).toBe("a".repeat(10) + "...");
  });
});
