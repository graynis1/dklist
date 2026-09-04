/**
 * Real gap found via customer report: the book page never showed which
 * language a book is in anywhere - a real, useful piece of information
 * on a bulk-imported catalog spanning many languages, and something a
 * reader would reasonably expect to see before clicking "oku". `book.lang`
 * stores ISO 639-1-ish codes (confirmed via existing code: `b.lang = 'tr'`
 * comparisons throughout books.ts/book-detail.ts) - this covers the
 * languages that actually show up in real usage, not an exhaustive
 * ISO-639 table, and falls back to the raw code (uppercased) for anything
 * not listed rather than hiding the information entirely.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  fr: "Fransızca",
  de: "Almanca",
  es: "İspanyolca",
  it: "İtalyanca",
  ru: "Rusça",
  ar: "Arapça",
  fa: "Farsça",
  ja: "Japonca",
  zh: "Çince",
  ko: "Korece",
  pt: "Portekizce",
  nl: "Felemenkçe",
  pl: "Lehçe",
  sv: "İsveççe",
  el: "Yunanca",
  he: "İbranice",
  ur: "Urduca",
  hi: "Hintçe",
  und: "Bilinmiyor",
};

export function languageName(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  return LANGUAGE_NAMES[normalized] ?? normalized.toUpperCase();
}
