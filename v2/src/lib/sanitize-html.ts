import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Blog authoring previously stored plain text only (a `<textarea>`), so
 * `dangerouslySetInnerHTML` on the read side (see blog/[slug]/page.tsx's
 * `looksLikeHtml` branch) only ever rendered legacy/imported content, never
 * live user input - its own comment says so explicitly. Now that
 * `RichTextEditor` lets a live Blogger (a real, lower-trust role than
 * Admin) submit real HTML, that assumption is gone: this is the one and
 * only enforcement point that keeps a compromised/malicious Blogger
 * account from storing a stored-XSS payload that runs for every reader.
 * Allow-list matches exactly the tags the renderer already has real CSS
 * for - nothing else survives.
 */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "div", "h1", "h2", "h3", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "img", "br", "span", "blockquote"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
    // No `style` in allowedAttributes above - Word/Google Docs paste comes
    // with a lot of inline style clutter, dropped rather than allow-listed
    // (inline CSS is its own injection surface, e.g. background-image
    // exfiltration) - a cosmetic loss, not a functional one.
  });
}
