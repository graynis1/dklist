import sanitizeHtml from "sanitize-html";

/**
 * Pure sanitization logic, split out of sanitize-html.ts (which carries
 * `import "server-only"`) so it can be unit-tested directly - importing a
 * server-only module throws in a plain Node/vitest environment, the same
 * reason roles.ts was split out of permission.ts. sanitize-html.ts re-exports
 * this unchanged for its one real caller (src/actions/blog.ts).
 */
export function sanitizeBlogHtmlCore(html: string): string {
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
  });
}
