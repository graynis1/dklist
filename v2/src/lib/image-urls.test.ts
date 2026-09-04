import { describe, expect, it } from "vitest";
import { advertisementImageUrl, avatarUrl, feedPostImageUrl, sitePopupImageUrl } from "./image-urls";

describe("advertisementImageUrl", () => {
  it("prefixes a bare filename with the advertisement-image proxy path", () => {
    expect(advertisementImageUrl("8e4f.webp")).toBe("/api/advertisement-image/8e4f.webp");
  });
});

describe("feedPostImageUrl", () => {
  it("prefixes a bare filename with the feed-post-image proxy path", () => {
    expect(feedPostImageUrl("a1b2.webp")).toBe("/api/feed-post-image/a1b2.webp");
  });
});

describe("avatarUrl", () => {
  it("prefixes a bare filename with the avatar proxy path", () => {
    expect(avatarUrl("8e4f1234.webp")).toBe("/api/avatar/8e4f1234.webp");
  });

  it("returns null for null", () => {
    expect(avatarUrl(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(avatarUrl(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(avatarUrl("")).toBeNull();
  });
});

describe("sitePopupImageUrl", () => {
  it("prefixes a bare filename with the site-popup-image proxy path", () => {
    expect(sitePopupImageUrl("promo.webp")).toBe("/api/site-popup-image/promo.webp");
  });

  it("passes a full http(s) URL through unchanged (legacy Cloudinary values)", () => {
    const cloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v1/promo.png";
    expect(sitePopupImageUrl(cloudinaryUrl)).toBe(cloudinaryUrl);
  });

  it("is case-insensitive on the scheme", () => {
    const url = "HTTP://example.com/promo.png";
    expect(sitePopupImageUrl(url)).toBe(url);
  });

  it("does not treat an http-looking substring mid-string as a full URL", () => {
    // A bare filename that happens to contain "http" is not itself a URL -
    // only a genuine leading scheme should skip the proxy prefix.
    expect(sitePopupImageUrl("my-http-photo.webp")).toBe("/api/site-popup-image/my-http-photo.webp");
  });
});
