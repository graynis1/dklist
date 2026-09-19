import "server-only";
import { sanitizeBlogHtmlCore } from "./sanitize-blog-html-core";

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
 *
 * The actual sanitization logic lives in sanitize-blog-html-core.ts (no
 * `server-only` import) so it can be unit-tested directly - see that
 * file's own comment.
 */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeBlogHtmlCore(html);
}
