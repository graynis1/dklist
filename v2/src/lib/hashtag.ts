export interface HashtagSegment {
  type: "text" | "tag";
  value: string;
}

// \p{L}\p{N}_ (not \w) so Turkish letters (ç, ğ, ı, ö, ş, ü) count as tag
// characters too. A bare "#" with nothing after it never matches, so it
// falls through as plain text - the customer's 3rd "stays black" state.
const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

export function parseHashtagSegments(text: string): HashtagSegment[] {
  const segments: HashtagSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(HASHTAG_RE)) {
    const start = match.index;
    if (start > lastIndex) segments.push({ type: "text", value: text.slice(lastIndex, start) });
    segments.push({ type: "tag", value: match[1] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: "text", value: text.slice(lastIndex) });
  return segments;
}

/** Unique, lowercased tag words for a reader-mention lookup against usernames. */
export function extractHashtagTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(HASHTAG_RE)) tags.add(match[1].toLowerCase());
  return [...tags];
}
