/**
 * Blog content is stored as rich-text HTML (Quill.js output on the web,
 * which renders it directly) - mobile doesn't embed a WebView/HTML
 * renderer (see the app's own "no WebView" rule), so this converts it to
 * plain, readable text instead of dumping raw tags. A real formatting
 * loss (no bold/italic), not pretended away - a rich-text renderer
 * (`react-native-render-html` or similar) is a real next step if the
 * lost formatting turns out to matter, not built here.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
