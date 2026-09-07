import { describe, expect, it } from "vitest";
import { describeFeedItem, type FeedItemDescriptionInput } from "./feed-item-description";

function item(overrides: Partial<FeedItemDescriptionInput>): FeedItemDescriptionInput {
  return {
    reason: "book_read",
    entityKind: null,
    isQuote: false,
    targetLabel: null,
    ...overrides,
  };
}

describe("describeFeedItem", () => {
  it("book_read shows the quoted book target", () => {
    expect(describeFeedItem(item({ reason: "book_read", targetLabel: "Suç ve Ceza" }))).toEqual({
      verb: "kitabı okudu",
      target: '"Suç ve Ceza"',
    });
  });

  it("library_add shows the quoted book target", () => {
    expect(describeFeedItem(item({ reason: "library_add", targetLabel: "1984" }))).toEqual({
      verb: "kitaplığına ekledi",
      target: '"1984"',
    });
  });

  it.each([
    ["book", "kitabını puanladı"],
    ["writer", "yazarını puanladı"],
    ["translator", "çevirmenini puanladı"],
  ] as const)("rating on a %s target", (entityKind, verb) => {
    expect(
      describeFeedItem(item({ reason: "rating", entityKind, targetLabel: "Fyodor Dostoyevski" })),
    ).toEqual({ verb, target: '"Fyodor Dostoyevski"' });
  });

  it("rating falls through to the translator phrasing for an unrecognized entityKind", () => {
    // Mirrors the original inline describe()'s implicit else - not a new
    // behavior, just now something a test can pin down instead of only
    // being implied by the code's shape.
    expect(describeFeedItem(item({ reason: "rating", entityKind: "user", targetLabel: "x" }))).toEqual({
      verb: "çevirmenini puanladı",
      target: '"x"',
    });
  });

  it.each([
    ["book", "kitabını beğendi"],
    ["writer", "yazarını beğendi"],
    ["translator", "çevirmenini beğendi"],
  ] as const)("like on a %s target", (entityKind, verb) => {
    expect(describeFeedItem(item({ reason: "like", entityKind, targetLabel: "Kürk Mantolu Madonna" }))).toEqual({
      verb,
      target: '"Kürk Mantolu Madonna"',
    });
  });

  it("comment as a quote", () => {
    expect(describeFeedItem(item({ reason: "comment", isQuote: true, targetLabel: "ignored" }))).toEqual({
      verb: "bir alıntı paylaştı",
      target: null,
    });
  });

  it("comment as a plain comment never shows a target, even if one is set", () => {
    expect(describeFeedItem(item({ reason: "comment", isQuote: false, targetLabel: "ignored" }))).toEqual({
      verb: "bir yorum yazdı",
      target: null,
    });
  });

  it("follow at-mentions the target instead of quoting it", () => {
    expect(describeFeedItem(item({ reason: "follow", targetLabel: "ahmet" }))).toEqual({
      verb: "takip etmeye başladı",
      target: "@ahmet",
    });
  });

  it("follow with no target label omits the target entirely", () => {
    expect(describeFeedItem(item({ reason: "follow", targetLabel: null }))).toEqual({
      verb: "takip etmeye başladı",
      target: null,
    });
  });

  it("blog_published shows the quoted post title", () => {
    expect(describeFeedItem(item({ reason: "blog_published", targetLabel: "Yeni Bir Başlangıç" }))).toEqual({
      verb: "yeni bir blog yazısı yayınladı:",
      target: '"Yeni Bir Başlangıç"',
    });
  });

  it("store_listing shows the quoted listing title", () => {
    expect(describeFeedItem(item({ reason: "store_listing", targetLabel: "Simyacı - Temiz Nüsha" }))).toEqual({
      verb: "askıda kitap ilanı verdi:",
      target: '"Simyacı - Temiz Nüsha"',
    });
  });

  it("author_post never shows a target", () => {
    expect(describeFeedItem(item({ reason: "author_post", targetLabel: "ignored" }))).toEqual({
      verb: "Yazarhane'de yeni bir yazı paylaştı",
      target: null,
    });
  });

  it("club_join shows the quoted club name", () => {
    expect(describeFeedItem(item({ reason: "club_join", targetLabel: "Klasikler Kulübü" }))).toEqual({
      verb: "kulübüne katıldı",
      target: '"Klasikler Kulübü"',
    });
  });

  it("feed_post never shows a target", () => {
    expect(describeFeedItem(item({ reason: "feed_post", targetLabel: "ignored" }))).toEqual({
      verb: "bir gönderi paylaştı",
      target: null,
    });
  });

  it("returns a null target for reasons that normally quote one, when targetLabel is null", () => {
    expect(describeFeedItem(item({ reason: "book_read", targetLabel: null })).target).toBeNull();
  });
});
