/**
 * Single source of truth for every real ad placement wired into the site
 * via <AdSlot placement="..."> - previously the admin's "Yeni Reklam Ekle"
 * form took a bare free-text placement string with zero guidance, so
 * creating an ad for the right spot depended on someone already knowing
 * (or guessing correctly) the exact string literal a developer used in a
 * page's source. A typo here silently means the ad never renders anywhere,
 * with no error - this list is what lets the admin form become a real
 * dropdown instead of a blind free-text field.
 */
export const AD_PLACEMENTS = [
  { id: "homepage-banner", label: "Ana Sayfa - Banner" },
  { id: "book-page", label: "Kitap Sayfası" },
  { id: "kitaplar-listesi", label: "Kitaplar Listesi" },
  { id: "yazarlar-listesi", label: "Yazarlar Listesi" },
  { id: "akis", label: "Akış (Topluluk Feed)" },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];
