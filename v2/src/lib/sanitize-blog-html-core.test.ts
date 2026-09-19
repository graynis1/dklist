import { describe, it, expect } from "vitest";
import { sanitizeBlogHtmlCore } from "./sanitize-blog-html-core";

describe("sanitizeBlogHtmlCore", () => {
  it("strips <script> tags and their contents entirely", () => {
    expect(sanitizeBlogHtmlCore("<p>hi</p><script>alert(document.cookie)</script>")).toBe("<p>hi</p>");
  });

  it("strips disallowed tags like <iframe> but keeps surrounding allowed content", () => {
    expect(sanitizeBlogHtmlCore('<p>a</p><iframe src="https://evil.com"></iframe><p>b</p>')).toBe("<p>a</p><p>b</p>");
  });

  it("strips inline event-handler attributes (onerror, onclick) but keeps the tag", () => {
    expect(sanitizeBlogHtmlCore('<img src="https://x.com/a.png" onerror="alert(1)" alt="x">')).toBe(
      '<img src="https://x.com/a.png" alt="x" />',
    );
    expect(sanitizeBlogHtmlCore('<p onclick="alert(1)">hi</p>')).toBe("<p>hi</p>");
  });

  it("drops a javascript: href instead of passing it through", () => {
    const out = sanitizeBlogHtmlCore('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("href");
  });

  it("drops javascript:/data: img src (not in the img-specific allowed schemes)", () => {
    expect(sanitizeBlogHtmlCore('<img src="javascript:alert(1)">')).toBe("<img />");
    expect(sanitizeBlogHtmlCore('<img src="data:image/png;base64,AAAA">')).toBe("<img />");
  });

  it("keeps a real https img src and its alt text", () => {
    expect(sanitizeBlogHtmlCore('<img src="https://x.com/cover.png" alt="cover">')).toBe(
      '<img src="https://x.com/cover.png" alt="cover" />',
    );
  });

  it("allows mailto: links (an explicitly allowed scheme for <a>)", () => {
    expect(sanitizeBlogHtmlCore('<a href="mailto:x@y.com">mail</a>')).toBe(
      '<a href="mailto:x@y.com" rel="noopener noreferrer nofollow" target="_blank">mail</a>',
    );
  });

  it("strips the style attribute (dropped, not allow-listed, per its own inline-CSS-injection comment)", () => {
    expect(sanitizeBlogHtmlCore('<p style="background:url(https://evil.com/exfil)">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips attributes with no allow-list entry, like class", () => {
    expect(sanitizeBlogHtmlCore('<span class="foo">x</span>')).toBe("<span>x</span>");
  });

  it("forces rel=noopener noreferrer nofollow and target=_blank on every link, overriding attacker-supplied values", () => {
    expect(sanitizeBlogHtmlCore('<a href="https://evil.com" target="_self" rel="opener">click</a>')).toBe(
      '<a href="https://evil.com" target="_blank" rel="noopener noreferrer nofollow">click</a>',
    );
  });

  it("passes through nested allowed formatting tags unchanged", () => {
    const input = "<div><h2>Title</h2><p>Body <strong>bold</strong> and <em>em</em></p></div>";
    expect(sanitizeBlogHtmlCore(input)).toBe(input);
  });

  it("strips SVG entirely, including onload payloads", () => {
    expect(sanitizeBlogHtmlCore('<svg onload="alert(1)"><circle /></svg>')).toBe("");
  });

  it("handles empty input and plain text without markup", () => {
    expect(sanitizeBlogHtmlCore("")).toBe("");
    expect(sanitizeBlogHtmlCore("just text")).toBe("just text");
  });
});
