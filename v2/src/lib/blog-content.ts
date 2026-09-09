/** A cheap real-tag sniff (not a full HTML validator) - good enough to tell
 * "this is markup" apart from plain text that happens to contain a bare
 * `<`/`>` character (e.g. "5 < 10 kitap okudum"). Shared between the
 * blog detail page's render branch and RichTextEditor's edit-load branch so
 * both agree on what counts as "already HTML" - see blog/[slug]/page.tsx's
 * own doc comment on the two-formats-in-one-column history this exists for. */
export function looksLikeHtml(text: string): boolean {
  return /<\/?(p|div|h[1-6]|strong|em|b|i|ul|ol|li|a|img|br|span|blockquote)\b[^>]*>/i.test(text);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Converts a legacy plain-text post (newline-separated, no markup) into
 * safe HTML paragraphs so RichTextEditor can load it without collapsing
 * every line break into one run-on line - contentEditable/innerHTML has no
 * concept of `whitespace-pre-line`, unlike the read-only render path. */
export function plainTextToEditableHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
