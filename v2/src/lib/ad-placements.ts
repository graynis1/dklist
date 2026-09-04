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
  { id: "akis-sidebar", label: "Akış - Yan Panel" },
  { id: "mesajlar", label: "Mesajlar Sayfası" },
  // Customer's ask (2026-09-02): the empty left/right gutters visible on
  // wide monitors (see site-header's own max-w-[100rem] vs. most content
  // maxing out around max-w-6xl) should host real ad space too, sticky as
  // you scroll - see SkyscraperAds, wired site-wide in the root layout,
  // not per-page like the others above.
  { id: "skyscraper-left", label: "Sol Kenar (Sticky, Geniş Ekran)" },
  { id: "skyscraper-right", label: "Sağ Kenar (Sticky, Geniş Ekran)" },
  // Customer's full-site sweep (2026-09-03): "Yazarlara reklam / Yayınevleri
  // kısmına reklam / Çevirmenlerde dahil / Ayın kitabı / Yazarhane /
  // Rozet Tablosu, Rozetler, Puan Mağazası / Keşfet / Bildirim" - every
  // remaining real page that had no ad slot at all yet, listed page by page.
  { id: "writer-page", label: "Yazar Sayfası" },
  { id: "publisher-page", label: "Yayınevi Sayfası" },
  { id: "translator-page", label: "Çevirmen Sayfası" },
  { id: "yayinevleri-listesi", label: "Yayınevleri Listesi" },
  { id: "cevirmenler-listesi", label: "Çevirmenler Listesi" },
  { id: "kategori-sayfasi", label: "Kategori Sayfası" },
  { id: "ayin-kitabi", label: "Ayın Kitabı" },
  { id: "yazarhane", label: "Yazarhane" },
  { id: "puan-tablosu", label: "Puan Tablosu" },
  { id: "rozetler", label: "Rozetler" },
  { id: "puan-magazasi", label: "Puan Mağazası" },
  { id: "ara", label: "Arama / Keşfet" },
  { id: "bildirimler", label: "Bildirimler" },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];
