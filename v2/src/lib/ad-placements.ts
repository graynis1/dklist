/**
 * Single source of truth for every real ad placement wired into the site
 * via <AdSlot placement="..."> - previously the admin's "Yeni Reklam Ekle"
 * form took a bare free-text placement string with zero guidance, so
 * creating an ad for the right spot depended on someone already knowing
 * (or guessing correctly) the exact string literal a developer used in a
 * page's source. A typo here silently means the ad never renders anywhere,
 * with no error - this list is what lets the admin form become a real
 * dropdown instead of a blind free-text field.
 *
 * `recommendedSize` (added 2026-09-08, closes the "Ad creative size specs
 * shown to advertisers" gap noted in PLAN.md) - AdSlot/HouseAd render an
 * uploaded image at `w-full` with no fixed aspect ratio, so nothing ever
 * technically rejects a wrong-shaped upload, but the wrong shape still
 * looks bad (a square logo stretched across a 3:1 banner, a wide banner
 * squeezed into the 160px-wide skyscraper gutter). Three real rendered
 * shapes exist (see house-ad.tsx's `tall`/`skyscraper` flags, the source of
 * truth for the layout itself): the skyscraper gutters (SkyscraperAds,
 * `w-40` = 160px wide, up to 850px tall - matches the IAB "Wide Skyscraper"
 * convention), `akis-sidebar`'s `aspect-[4/5]` card, and every other
 * placement's plain wide banner inside a `max-w-3xl` (768px) column.
 */
export const AD_PLACEMENTS = [
  { id: "homepage-banner", label: "Ana Sayfa - Banner", recommendedSize: "1200×400 px (3:1)" },
  { id: "book-page", label: "Kitap Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "kitaplar-listesi", label: "Kitaplar Listesi", recommendedSize: "1200×400 px (3:1)" },
  { id: "yazarlar-listesi", label: "Yazarlar Listesi", recommendedSize: "1200×400 px (3:1)" },
  { id: "akis", label: "Akış (Topluluk Feed)", recommendedSize: "1200×400 px (3:1)" },
  { id: "akis-sidebar", label: "Akış - Yan Panel", recommendedSize: "1000×1250 px (4:5)" },
  { id: "mesajlar", label: "Mesajlar Sayfası", recommendedSize: "1200×400 px (3:1)" },
  // Customer's ask (2026-09-02): the empty left/right gutters visible on
  // wide monitors (see site-header's own max-w-[100rem] vs. most content
  // maxing out around max-w-6xl) should host real ad space too, sticky as
  // you scroll - see SkyscraperAds, wired site-wide in the root layout,
  // not per-page like the others above.
  { id: "skyscraper-left", label: "Sol Kenar (Sticky, Geniş Ekran)", recommendedSize: "160×600 px" },
  { id: "skyscraper-right", label: "Sağ Kenar (Sticky, Geniş Ekran)", recommendedSize: "160×600 px" },
  // Customer's full-site sweep (2026-09-03): "Yazarlara reklam / Yayınevleri
  // kısmına reklam / Çevirmenlerde dahil / Ayın kitabı / Yazarhane /
  // Rozet Tablosu, Rozetler, Puan Mağazası / Keşfet / Bildirim" - every
  // remaining real page that had no ad slot at all yet, listed page by page.
  { id: "writer-page", label: "Yazar Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "publisher-page", label: "Yayınevi Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "translator-page", label: "Çevirmen Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "yayinevleri-listesi", label: "Yayınevleri Listesi", recommendedSize: "1200×400 px (3:1)" },
  { id: "cevirmenler-listesi", label: "Çevirmenler Listesi", recommendedSize: "1200×400 px (3:1)" },
  { id: "kategori-sayfasi", label: "Kategori Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "ayin-kitabi", label: "Ayın Kitabı", recommendedSize: "1200×400 px (3:1)" },
  { id: "yazarhane", label: "Yazarhane", recommendedSize: "1200×400 px (3:1)" },
  { id: "puan-tablosu", label: "Puan Tablosu", recommendedSize: "1200×400 px (3:1)" },
  { id: "rozetler", label: "Rozetler", recommendedSize: "1200×400 px (3:1)" },
  { id: "puan-magazasi", label: "Puan Mağazası", recommendedSize: "1200×400 px (3:1)" },
  { id: "ara", label: "Arama / Keşfet", recommendedSize: "1200×400 px (3:1)" },
  { id: "bildirimler", label: "Bildirimler", recommendedSize: "1200×400 px (3:1)" },
  // Customer's ad-sweep follow-up (2026-09-05): profile page ("insanların
  // en çok kullanacağı kısım") plus 3 more real pages that still had no
  // slot at all - see house-ad.tsx's doc comment on the 2026-09-03 sweep
  // for why every new placement below reuses one of the 9 existing
  // creative themes rather than inventing new ones.
  { id: "profil", label: "Profil Sayfası", recommendedSize: "1200×400 px (3:1)" },
  { id: "askida-kitap", label: "Askıda Kitap", recommendedSize: "1200×400 px (3:1)" },
  { id: "kulupler", label: "Kitap Kulüpleri Listesi", recommendedSize: "1200×400 px (3:1)" },
  { id: "listeler", label: "Listeler", recommendedSize: "1200×400 px (3:1)" },
  // Customer's follow-up feedback doc (2026-09-07): "Blog kısmına reklam
  // koyabilir miyiz orası da değerlendirilebilir unutmuşum" - the blog
  // detail page was actually rendering an ad already, but it borrowed the
  // "akis-sidebar" placement id wholesale (a copy/paste leftover), which
  // meant an admin could not target the blog page specifically - any ad
  // aimed at Akış's own sidebar would leak onto every blog post too, and
  // there was no way to run a blog-only campaign. Real, separate placement.
  { id: "blog-post", label: "Blog Yazısı", recommendedSize: "1200×400 px (3:1)" },
] as const;

export type AdPlacementId = (typeof AD_PLACEMENTS)[number]["id"];
