import Link from "next/link";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { SparklesIcon, GiftIcon, UsersIcon, PenToolIcon, ShoppingBagIcon, AwardIcon, MessagesSquareIcon, BookOpenIcon } from "lucide-react";
import type { AdPlacementId } from "@/lib/ad-placements";
import { cn } from "@/lib/utils";

/**
 * Real, animated, code-based house ad - the permanent "never truly empty"
 * fallback for every placement. Customer's ask (2026-09-02): the earlier
 * flat-image house ads should be "hareketli" (moving/alive) real HTML, not
 * static pictures - this also fixes the mobile text-scaling problem at its
 * root (real DOM text reflows and sizes normally at every viewport, no
 * separate mobile creative needed at all, unlike a raster image with text
 * baked in). AdSlot renders this only when neither a real AdSense slot nor
 * an admin-uploaded advertiser image exists for the placement, so a real
 * paid ad always takes priority the moment one exists - this is the floor,
 * not the ceiling.
 *
 * Redesigned again 2026-09-03 per direct customer feedback on the previous
 * "glass card" pass: "çerçeveleri yalnızca kalınlaştırmışsın... saçma
 * renkli şeritlere değil, gerçekten havalı ve ayrıcalıklı görünen
 * çerçevelere ihtiyacımız var" (you just made the borders thicker - we
 * need frames that look genuinely cool/exclusive, not silly colored
 * stripes). The previous version's actual flaw wasn't shadow depth, it was
 * that each card's ENTIRE surface was flooded with a saturated per-ad
 * gradient - reads as a cheap banner-ad stripe no matter how good the
 * shadow is. Fixed at the root: every card now shares one dark graphite
 * "membership card" surface (CARD_SURFACE), and each ad's own hue is used
 * only as a restrained accent - a thin shimmering foil border, a soft
 * corner glow, the icon-ring stroke, the kicker label, the outlined CTA.
 * This is the actual visual grammar of exclusive-tier cards/badges (transit
 * card, premium membership tiers, credit-card metal finishes): dark neutral
 * body + one precise accent line, not a colorful flood.
 */
interface HouseAdSpec {
  href: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  /** Thin animated "foil" gradient used only for the 1px shimmering border,
   * never as a surface fill - keeps each ad recognizable by hue without
   * reintroducing the "colored stripe" look the customer rejected. */
  edge: string;
  /** Bright accent used for the icon-ring stroke, kicker, corner glow and
   * outlined CTA - always a light/saturated tone so it reads as a precise
   * line against the dark CARD_SURFACE. */
  accent: string;
  /** Text/icon color for whatever sits ON TOP of a solid `accent` fill
   * (the CTA once hover-filled) - always a dark tone, the inverse of
   * `accent`. */
  onAccent: string;
  tall?: boolean;
  /** Very narrow, very tall "skyscraper" layout for the left/right viewport
   * gutters (SkyscraperAds, wired site-wide in the root layout) - a
   * completely different shape from `tall` (which is still a normal
   * card-sized square-ish unit), so it gets its own rendering branch
   * rather than reusing the same wrapper/className defaults. */
  skyscraper?: boolean;
}

/** Shared dark "membership card" surface every ad sits on, regardless of
 * its own accent hue - this uniformity (not a per-ad flood color) is what
 * reads as one deliberate, premium product line instead of nine unrelated
 * banner colors. Slightly cool graphite so warm AND cool accent hues both
 * pop against it. */
const CARD_SURFACE = "linear-gradient(165deg, oklch(0.225 0.015 260), oklch(0.125 0.01 260))";

/** Outer elevation - a dark card needs a real lift off the page, so this is
 * stronger than a light card would need, plus a hairline top highlight for
 * the "machined edge" look. */
const OUTER_SHADOW =
  "inset 0 1px 0 0 rgb(255 255 255 / 0.14), 0 30px 60px -22px rgb(0 0 0 / 0.65), 0 10px 26px -12px rgb(0 0 0 / 0.5)";

const HOUSE_ADS: Record<AdPlacementId, HouseAdSpec> = {
  "homepage-banner": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    edge: "linear-gradient(135deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
  },
  "book-page": {
    href: "/puan-magazasi",
    icon: GiftIcon,
    kicker: "Puan Mağazası",
    title: "Okudukça Kazan, Kazandıkça Harca",
    sub: "Puanlarını biriktir, mağazadan gerçek ödüllere dönüştür.",
    cta: "Mağazaya Git",
    edge: "linear-gradient(135deg, oklch(0.83 0.13 85), transparent 35%, transparent 65%, oklch(0.83 0.13 85))",
    accent: "oklch(0.8 0.13 85)",
    onAccent: "oklch(0.22 0.05 70)",
  },
  "kitaplar-listesi": {
    href: "/kulupler",
    icon: UsersIcon,
    kicker: "Kitap Kulüpleri",
    title: "Yalnız Okuma, Birlikte Keşfet",
    sub: "Sana uygun bir kitap kulübü bul, tartış, aynı kitabı birlikte bitirin.",
    cta: "Kulüplere Katıl",
    edge: "linear-gradient(135deg, oklch(0.78 0.13 130), transparent 35%, transparent 65%, oklch(0.78 0.13 130))",
    accent: "oklch(0.76 0.13 130)",
    onAccent: "oklch(0.18 0.04 140)",
  },
  "yazarlar-listesi": {
    href: "/yazarhane",
    icon: PenToolIcon,
    kicker: "Yazarhane",
    title: "Sen de Bir Yazar mısın?",
    sub: "Yazarhane'de gerçek okurlarınla buluş, kitaplarını tanıt.",
    cta: "Yazarhane'yi Gör",
    edge: "linear-gradient(135deg, oklch(0.78 0.1 210), transparent 35%, transparent 65%, oklch(0.78 0.1 210))",
    accent: "oklch(0.76 0.1 210)",
    onAccent: "oklch(0.18 0.04 230)",
  },
  akis: {
    href: "/askida-kitap",
    icon: ShoppingBagIcon,
    kicker: "Askıda Kitap",
    title: "Aradığın Kitap Belki de Yanı Başında",
    sub: "İkinci el kitap bul, kendi kitaplarını da başkalarıyla paylaş.",
    cta: "Askıya Bak",
    edge: "linear-gradient(135deg, oklch(0.82 0.13 55), transparent 35%, transparent 65%, oklch(0.82 0.13 55))",
    accent: "oklch(0.8 0.13 55)",
    onAccent: "oklch(0.2 0.06 30)",
  },
  "akis-sidebar": {
    href: "/rozetler",
    icon: AwardIcon,
    kicker: "Rozetler",
    title: "Rozetlerini Topla",
    sub: "Okudukça, puanladıkça, paylaştıkça yeni rozetler kazan.",
    cta: "Rozetleri Gör",
    edge: "linear-gradient(160deg, oklch(0.82 0.12 20), transparent 35%, transparent 65%, oklch(0.82 0.12 20))",
    accent: "oklch(0.8 0.12 20)",
    onAccent: "oklch(0.2 0.06 340)",
    tall: true,
  },
  mesajlar: {
    href: "/kulup/yeni",
    icon: MessagesSquareIcon,
    kicker: "Kitap Kulübü Kur",
    title: "Kendi Kulübünü Sen Kur",
    sub: "Arkadaşlarını davet et, aynı kitabı okuyup birlikte tartışın.",
    cta: "Kulüp Kur",
    edge: "linear-gradient(135deg, oklch(0.8 0.11 160), transparent 35%, transparent 65%, oklch(0.8 0.11 160))",
    accent: "oklch(0.78 0.11 160)",
    onAccent: "oklch(0.17 0.04 190)",
  },
  "skyscraper-left": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız Oku",
    sub: "Temiz bir deneyim seni bekliyor.",
    cta: "Keşfet",
    edge: "linear-gradient(170deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
    skyscraper: true,
  },
  "skyscraper-right": {
    href: "/kulupler",
    icon: BookOpenIcon,
    kicker: "Kulüpler",
    title: "Birlikte Oku",
    sub: "Sana uygun bir kulüp bul.",
    cta: "Katıl",
    edge: "linear-gradient(170deg, oklch(0.78 0.13 130), transparent 35%, transparent 65%, oklch(0.78 0.13 130))",
    accent: "oklch(0.76 0.13 130)",
    onAccent: "oklch(0.18 0.04 140)",
    skyscraper: true,
  },
  // Customer's full-site ad sweep (2026-09-03): every remaining real page
  // that had no ad slot at all - reusing the existing 9 creative themes
  // above rather than inventing new colors, same precedent already set by
  // skyscraper-left/right duplicating homepage-banner/kitaplar-listesi's
  // own copy verbatim - a real ad-rotation system repeats creative sets
  // across placements too, this isn't a shortcut.
  "writer-page": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    edge: "linear-gradient(135deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
  },
  "publisher-page": {
    href: "/puan-magazasi",
    icon: GiftIcon,
    kicker: "Puan Mağazası",
    title: "Okudukça Kazan, Kazandıkça Harca",
    sub: "Puanlarını biriktir, mağazadan gerçek ödüllere dönüştür.",
    cta: "Mağazaya Git",
    edge: "linear-gradient(135deg, oklch(0.83 0.13 85), transparent 35%, transparent 65%, oklch(0.83 0.13 85))",
    accent: "oklch(0.8 0.13 85)",
    onAccent: "oklch(0.22 0.05 70)",
  },
  "translator-page": {
    href: "/kulupler",
    icon: UsersIcon,
    kicker: "Kitap Kulüpleri",
    title: "Yalnız Okuma, Birlikte Keşfet",
    sub: "Sana uygun bir kitap kulübü bul, tartış, aynı kitabı birlikte bitirin.",
    cta: "Kulüplere Katıl",
    edge: "linear-gradient(135deg, oklch(0.78 0.13 130), transparent 35%, transparent 65%, oklch(0.78 0.13 130))",
    accent: "oklch(0.76 0.13 130)",
    onAccent: "oklch(0.18 0.04 140)",
  },
  "yayinevleri-listesi": {
    href: "/yazarhane",
    icon: PenToolIcon,
    kicker: "Yazarhane",
    title: "Sen de Bir Yazar mısın?",
    sub: "Yazarhane'de gerçek okurlarınla buluş, kitaplarını tanıt.",
    cta: "Yazarhane'yi Gör",
    edge: "linear-gradient(135deg, oklch(0.78 0.1 210), transparent 35%, transparent 65%, oklch(0.78 0.1 210))",
    accent: "oklch(0.76 0.1 210)",
    onAccent: "oklch(0.18 0.04 230)",
  },
  "cevirmenler-listesi": {
    href: "/askida-kitap",
    icon: ShoppingBagIcon,
    kicker: "Askıda Kitap",
    title: "Aradığın Kitap Belki de Yanı Başında",
    sub: "İkinci el kitap bul, kendi kitaplarını da başkalarıyla paylaş.",
    cta: "Askıya Bak",
    edge: "linear-gradient(135deg, oklch(0.82 0.13 55), transparent 35%, transparent 65%, oklch(0.82 0.13 55))",
    accent: "oklch(0.8 0.13 55)",
    onAccent: "oklch(0.2 0.06 30)",
  },
  "kategori-sayfasi": {
    href: "/rozetler",
    icon: AwardIcon,
    kicker: "Rozetler",
    title: "Rozetlerini Topla",
    sub: "Okudukça, puanladıkça, paylaştıkça yeni rozetler kazan.",
    cta: "Rozetleri Gör",
    edge: "linear-gradient(160deg, oklch(0.82 0.12 20), transparent 35%, transparent 65%, oklch(0.82 0.12 20))",
    accent: "oklch(0.8 0.12 20)",
    onAccent: "oklch(0.2 0.06 340)",
  },
  "ayin-kitabi": {
    href: "/kulup/yeni",
    icon: MessagesSquareIcon,
    kicker: "Kitap Kulübü Kur",
    title: "Kendi Kulübünü Sen Kur",
    sub: "Arkadaşlarını davet et, aynı kitabı okuyup birlikte tartışın.",
    cta: "Kulüp Kur",
    edge: "linear-gradient(135deg, oklch(0.8 0.11 160), transparent 35%, transparent 65%, oklch(0.8 0.11 160))",
    accent: "oklch(0.78 0.11 160)",
    onAccent: "oklch(0.17 0.04 190)",
  },
  yazarhane: {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    edge: "linear-gradient(135deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
  },
  "puan-tablosu": {
    href: "/puan-magazasi",
    icon: GiftIcon,
    kicker: "Puan Mağazası",
    title: "Okudukça Kazan, Kazandıkça Harca",
    sub: "Puanlarını biriktir, mağazadan gerçek ödüllere dönüştür.",
    cta: "Mağazaya Git",
    edge: "linear-gradient(135deg, oklch(0.83 0.13 85), transparent 35%, transparent 65%, oklch(0.83 0.13 85))",
    accent: "oklch(0.8 0.13 85)",
    onAccent: "oklch(0.22 0.05 70)",
  },
  rozetler: {
    href: "/kulupler",
    icon: UsersIcon,
    kicker: "Kitap Kulüpleri",
    title: "Yalnız Okuma, Birlikte Keşfet",
    sub: "Sana uygun bir kitap kulübü bul, tartış, aynı kitabı birlikte bitirin.",
    cta: "Kulüplere Katıl",
    edge: "linear-gradient(135deg, oklch(0.78 0.13 130), transparent 35%, transparent 65%, oklch(0.78 0.13 130))",
    accent: "oklch(0.76 0.13 130)",
    onAccent: "oklch(0.18 0.04 140)",
  },
  "puan-magazasi": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    edge: "linear-gradient(135deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
  },
  ara: {
    href: "/yazarhane",
    icon: PenToolIcon,
    kicker: "Yazarhane",
    title: "Sen de Bir Yazar mısın?",
    sub: "Yazarhane'de gerçek okurlarınla buluş, kitaplarını tanıt.",
    cta: "Yazarhane'yi Gör",
    edge: "linear-gradient(135deg, oklch(0.78 0.1 210), transparent 35%, transparent 65%, oklch(0.78 0.1 210))",
    accent: "oklch(0.76 0.1 210)",
    onAccent: "oklch(0.18 0.04 230)",
  },
  bildirimler: {
    href: "/kulup/yeni",
    icon: MessagesSquareIcon,
    kicker: "Kitap Kulübü Kur",
    title: "Kendi Kulübünü Sen Kur",
    sub: "Arkadaşlarını davet et, aynı kitabı okuyup birlikte tartışın.",
    cta: "Kulüp Kur",
    edge: "linear-gradient(135deg, oklch(0.8 0.11 160), transparent 35%, transparent 65%, oklch(0.8 0.11 160))",
    accent: "oklch(0.78 0.11 160)",
    onAccent: "oklch(0.17 0.04 190)",
  },
  // 2026-09-05 follow-up sweep - profil/askida-kitap/kulupler/listeler.
  profil: {
    href: "/puan-magazasi",
    icon: GiftIcon,
    kicker: "Puan Mağazası",
    title: "Okudukça Kazan, Kazandıkça Harca",
    sub: "Puanlarını biriktir, mağazadan gerçek ödüllere dönüştür.",
    cta: "Mağazaya Git",
    edge: "linear-gradient(135deg, oklch(0.83 0.13 85), transparent 35%, transparent 65%, oklch(0.83 0.13 85))",
    accent: "oklch(0.8 0.13 85)",
    onAccent: "oklch(0.22 0.05 70)",
  },
  "askida-kitap": {
    href: "/kulupler",
    icon: UsersIcon,
    kicker: "Kitap Kulüpleri",
    title: "Yalnız Okuma, Birlikte Keşfet",
    sub: "Sana uygun bir kitap kulübü bul, tartış, aynı kitabı birlikte bitirin.",
    cta: "Kulüplere Katıl",
    edge: "linear-gradient(135deg, oklch(0.78 0.13 130), transparent 35%, transparent 65%, oklch(0.78 0.13 130))",
    accent: "oklch(0.76 0.13 130)",
    onAccent: "oklch(0.18 0.04 140)",
  },
  kulupler: {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    edge: "linear-gradient(135deg, oklch(0.85 0.12 70), transparent 35%, transparent 65%, oklch(0.85 0.12 70))",
    accent: "oklch(0.82 0.12 70)",
    onAccent: "oklch(0.2 0.05 40)",
  },
  listeler: {
    href: "/askida-kitap",
    icon: ShoppingBagIcon,
    kicker: "Askıda Kitap",
    title: "Aradığın Kitap Belki de Yanı Başında",
    sub: "İkinci el kitap bul, kendi kitaplarını da başkalarıyla paylaş.",
    cta: "Askıya Bak",
    edge: "linear-gradient(135deg, oklch(0.82 0.13 55), transparent 35%, transparent 65%, oklch(0.82 0.13 55))",
    accent: "oklch(0.8 0.13 55)",
    onAccent: "oklch(0.2 0.06 30)",
  },
};

/** Corner glow + shimmering sweep + top-row (wordmark/disclosure) markup is
 * identical across every layout variant - factored out so the three render
 * shapes below only differ in actual content layout, not in chrome. */
function CardChrome({ accent }: { accent: string }) {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{ width: 220, height: 220, top: -90, right: -90, background: accent, opacity: 0.18, animation: "house-ad-float 8s ease-in-out infinite" }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full"
        style={{
          background: "linear-gradient(75deg, transparent 40%, rgb(255 255 255 / 0.09) 50%, transparent 60%)",
          animation: "house-ad-sweep 6s ease-in-out infinite",
        }}
      />
      <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex items-center justify-between">
        <span className="font-heading text-[11px] font-semibold tracking-wide text-white/40 italic">DKList</span>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-medium tracking-wider text-white/45 uppercase">Reklam</span>
      </div>
    </>
  );
}

function Kicker({ accent, label, center }: { accent: string; label: string; center?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", center && "justify-center")}>
      <span className="h-px w-4" style={{ background: accent }} />
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>
        {label}
      </span>
    </div>
  );
}

export function HouseAd({ placement, className }: { placement: string; className?: string }) {
  const spec = HOUSE_ADS[placement as AdPlacementId];
  if (!spec) return null;
  const Icon = spec.icon;
  const vars = { "--accent": spec.accent, "--on-accent": spec.onAccent } as CSSProperties;

  if (spec.skyscraper) {
    return (
      <div className={className}>
        <Link
          href={spec.href}
          className="group relative block h-full w-full overflow-hidden rounded-2xl p-px transition-transform duration-300 hover:-translate-y-1"
          style={{ background: spec.edge, backgroundSize: "260% 260%", boxShadow: OUTER_SHADOW, animation: "house-ad-drift 10s ease-in-out infinite", ...vars }}
        >
          <div
            className="relative flex h-full flex-col items-center justify-between overflow-hidden rounded-[15px] px-4 py-6 text-center"
            style={{ background: CARD_SURFACE }}
          >
            <CardChrome accent={spec.accent} />

            <span
              className="relative z-10 mt-4 flex size-13 shrink-0 items-center justify-center rounded-full"
              style={{ border: `1.5px solid ${spec.accent}`, background: "rgb(255 255 255 / 0.04)", boxShadow: `0 0 18px -6px ${spec.accent}`, animation: "house-ad-bob 3.5s ease-in-out infinite" }}
            >
              <Icon style={{ color: spec.accent, width: 24, height: 24 }} strokeWidth={1.6} />
            </span>

            <div className="relative z-10 flex flex-col items-center gap-1.5">
              <Kicker accent={spec.accent} label={spec.kicker} center />
              <h3 className="font-heading text-balance text-sm leading-tight font-bold text-white">{spec.title}</h3>
              <p className="text-[11px] text-white/55">{spec.sub}</p>
            </div>

            <span className="house-ad-cta relative z-10 mb-2 inline-flex w-fit items-center gap-1 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {spec.cta} →
            </span>
          </div>
        </Link>
        <HouseAdKeyframes />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-3xl px-6", className)}>
      <Link
        href={spec.href}
        className="group relative block overflow-hidden rounded-2xl p-px transition-transform duration-300 hover:-translate-y-1"
        style={{ background: spec.edge, backgroundSize: "260% 260%", boxShadow: OUTER_SHADOW, animation: "house-ad-drift 10s ease-in-out infinite", ...vars }}
      >
        <div
          className={cn(
            "relative flex overflow-hidden rounded-[15px]",
            spec.tall ? "aspect-[4/5] flex-col items-center justify-center gap-4 p-8 text-center" : "items-center gap-6 p-7",
          )}
          style={{ background: CARD_SURFACE }}
        >
          <CardChrome accent={spec.accent} />

          <span
            className="relative z-10 flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: spec.tall ? 84 : 68,
              height: spec.tall ? 84 : 68,
              border: `1.5px solid ${spec.accent}`,
              background: "rgb(255 255 255 / 0.04)",
              boxShadow: `0 0 24px -6px ${spec.accent}`,
              animation: "house-ad-bob 3.5s ease-in-out infinite",
            }}
          >
            <Icon style={{ color: spec.accent, width: spec.tall ? 38 : 30, height: spec.tall ? 38 : 30 }} strokeWidth={1.6} />
          </span>

          <div className={cn("relative z-10 flex min-w-0 flex-col gap-1.5", spec.tall && "items-center")}>
            <Kicker accent={spec.accent} label={spec.kicker} center={spec.tall} />
            <h3 className={cn("font-heading font-bold text-balance text-white", spec.tall ? "text-2xl" : "text-xl sm:text-2xl")}>
              {spec.title}
            </h3>
            <p className={cn("text-sm text-white/60", spec.tall ? "max-w-xs" : "max-w-md")}>{spec.sub}</p>
            <span className="house-ad-cta mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase">
              {spec.cta}
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
      <HouseAdKeyframes />
    </div>
  );
}

function HouseAdKeyframes() {
  return (
    <style>{`
      @keyframes house-ad-drift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes house-ad-sweep {
        0% { transform: translateX(-120%); }
        35%, 100% { transform: translateX(220%); }
      }
      @keyframes house-ad-float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(10px) scale(1.06); }
      }
      @keyframes house-ad-bob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(-3deg); }
      }
      .house-ad-cta {
        border: 1px solid var(--accent);
        color: var(--accent);
        background: transparent;
        transition: background-color 0.25s ease, color 0.25s ease;
      }
      .group:hover .house-ad-cta {
        background: var(--accent);
        color: var(--on-accent);
      }
      @media (prefers-reduced-motion: reduce) {
        a[style], span[style] { animation: none !important; }
      }
    `}</style>
  );
}
