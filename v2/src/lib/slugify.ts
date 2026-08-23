const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  İ: "i",
  Ç: "c",
  Ğ: "g",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

/**
 * Turkish-character map must run BEFORE toLowerCase(), not after: JS's
 * locale-insensitive toLowerCase() turns capital İ (U+0130) into "i" plus
 * a combining dot above (U+0307), not the plain "i" this map expects to
 * replace it with - by the time toLowerCase() ran first, "İ" no longer
 * existed in the string for this regex to match, and the stray combining
 * character got swallowed into a spurious extra hyphen instead (a real
 * bug, caught via testing: "İletişim Yayınları" produced
 * "i-letisim-yayinlari" - note the wrong break after the first "i").
 */
export function slugify(input: string): string {
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => TURKISH_CHAR_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
