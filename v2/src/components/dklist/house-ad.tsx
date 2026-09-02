import Link from "next/link";
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
 */
interface HouseAdSpec {
  href: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  bg: string;
  fg: string;
  accent: string;
  badgeIcon: string;
  tall?: boolean;
  /** Very narrow, very tall "skyscraper" layout for the left/right viewport
   * gutters (SkyscraperAds, wired site-wide in the root layout) - a
   * completely different shape from `tall` (which is still a normal
   * card-sized square-ish unit), so it gets its own rendering branch
   * rather than reusing the same wrapper/className defaults. */
  skyscraper?: boolean;
}

const HOUSE_ADS: Record<AdPlacementId, HouseAdSpec> = {
  "homepage-banner": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız, Kesintisiz Okuma",
    sub: "DKList Premium ile daha temiz bir deneyim ve özel ayrıcalıklar seni bekliyor.",
    cta: "Premium'u Keşfet",
    bg: "linear-gradient(120deg, oklch(0.5 0.17 42), oklch(0.28 0.1 26), oklch(0.5 0.17 42))",
    fg: "oklch(0.98 0.01 75)",
    accent: "oklch(0.85 0.12 70)",
    badgeIcon: "oklch(0.22 0.06 40)",
  },
  "book-page": {
    href: "/puan-magazasi",
    icon: GiftIcon,
    kicker: "Puan Mağazası",
    title: "Okudukça Kazan, Kazandıkça Harca",
    sub: "Puanlarını biriktir, mağazadan gerçek ödüllere dönüştür.",
    cta: "Mağazaya Git",
    bg: "linear-gradient(120deg, oklch(0.64 0.14 90), oklch(0.36 0.09 70), oklch(0.64 0.14 90))",
    fg: "oklch(0.15 0.02 60)",
    accent: "oklch(0.28 0.08 30)",
    badgeIcon: "oklch(0.95 0.05 80)",
  },
  "kitaplar-listesi": {
    href: "/kulupler",
    icon: UsersIcon,
    kicker: "Kitap Kulüpleri",
    title: "Yalnız Okuma, Birlikte Keşfet",
    sub: "Sana uygun bir kitap kulübü bul, tartış, aynı kitabı birlikte bitirin.",
    cta: "Kulüplere Katıl",
    bg: "linear-gradient(120deg, oklch(0.48 0.08 150), oklch(0.26 0.05 150), oklch(0.48 0.08 150))",
    fg: "oklch(0.97 0.01 100)",
    accent: "oklch(0.78 0.13 130)",
    badgeIcon: "oklch(0.18 0.04 140)",
  },
  "yazarlar-listesi": {
    href: "/yazarhane",
    icon: PenToolIcon,
    kicker: "Yazarhane",
    title: "Sen de Bir Yazar mısın?",
    sub: "Yazarhane'de gerçek okurlarınla buluş, kitaplarını tanıt.",
    cta: "Yazarhane'yi Gör",
    bg: "linear-gradient(120deg, oklch(0.36 0.07 250), oklch(0.19 0.04 250), oklch(0.36 0.07 250))",
    fg: "oklch(0.96 0.01 90)",
    accent: "oklch(0.78 0.1 210)",
    badgeIcon: "oklch(0.18 0.04 230)",
  },
  akis: {
    href: "/askida-kitap",
    icon: ShoppingBagIcon,
    kicker: "Askıda Kitap",
    title: "Aradığın Kitap Belki de Yanı Başında",
    sub: "İkinci el kitap bul, kendi kitaplarını da başkalarıyla paylaş.",
    cta: "Askıya Bak",
    bg: "linear-gradient(120deg, oklch(0.42 0.13 22), oklch(0.2 0.07 18), oklch(0.42 0.13 22))",
    fg: "oklch(0.96 0.02 60)",
    accent: "oklch(0.82 0.13 55)",
    badgeIcon: "oklch(0.2 0.06 30)",
  },
  "akis-sidebar": {
    href: "/rozetler",
    icon: AwardIcon,
    kicker: "Rozetler",
    title: "Rozetlerini Topla",
    sub: "Okudukça, puanladıkça, paylaştıkça yeni rozetler kazan.",
    cta: "Rozetleri Gör",
    bg: "linear-gradient(160deg, oklch(0.44 0.12 335), oklch(0.2 0.07 335), oklch(0.44 0.12 335))",
    fg: "oklch(0.97 0.02 60)",
    accent: "oklch(0.82 0.12 20)",
    badgeIcon: "oklch(0.2 0.06 340)",
    tall: true,
  },
  mesajlar: {
    href: "/kulup/yeni",
    icon: MessagesSquareIcon,
    kicker: "Kitap Kulübü Kur",
    title: "Kendi Kulübünü Sen Kur",
    sub: "Arkadaşlarını davet et, aynı kitabı okuyup birlikte tartışın.",
    cta: "Kulüp Kur",
    bg: "linear-gradient(120deg, oklch(0.44 0.08 195), oklch(0.22 0.05 195), oklch(0.44 0.08 195))",
    fg: "oklch(0.96 0.02 100)",
    accent: "oklch(0.8 0.11 160)",
    badgeIcon: "oklch(0.17 0.04 190)",
  },
  "skyscraper-left": {
    href: "/premium",
    icon: SparklesIcon,
    kicker: "Premium",
    title: "Reklamsız Oku",
    sub: "Temiz bir deneyim seni bekliyor.",
    cta: "Keşfet",
    bg: "linear-gradient(170deg, oklch(0.5 0.17 42), oklch(0.28 0.1 26), oklch(0.5 0.17 42))",
    fg: "oklch(0.98 0.01 75)",
    accent: "oklch(0.85 0.12 70)",
    badgeIcon: "oklch(0.22 0.06 40)",
    skyscraper: true,
  },
  "skyscraper-right": {
    href: "/kulupler",
    icon: BookOpenIcon,
    kicker: "Kulüpler",
    title: "Birlikte Oku",
    sub: "Sana uygun bir kulüp bul.",
    cta: "Katıl",
    bg: "linear-gradient(170deg, oklch(0.48 0.08 150), oklch(0.26 0.05 150), oklch(0.48 0.08 150))",
    fg: "oklch(0.97 0.01 100)",
    accent: "oklch(0.78 0.13 130)",
    badgeIcon: "oklch(0.18 0.04 140)",
    skyscraper: true,
  },
};

export function HouseAd({ placement, className }: { placement: string; className?: string }) {
  const spec = HOUSE_ADS[placement as AdPlacementId];
  if (!spec) return null;
  const Icon = spec.icon;

  if (spec.skyscraper) {
    return (
      <div className={className}>
        <Link
          href={spec.href}
          className="group relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-lg border p-4 text-center shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
          style={{
            background: spec.bg,
            backgroundSize: "200% 200%",
            borderColor: "color-mix(in oklch, " + spec.fg + ", transparent 80%)",
            animation: "house-ad-drift 10s ease-in-out infinite",
          }}
        >
          <span
            className="pointer-events-none absolute top-2.5 left-1/2 z-10 -translate-x-1/2 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase"
            style={{ color: spec.fg, background: "rgb(0 0 0 / 0.16)" }}
          >
            Reklam
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-y-full"
            style={{
              background: "linear-gradient(160deg, transparent 40%, rgb(255 255 255 / 0.16) 50%, transparent 60%)",
              animation: "house-ad-sweep-v 6s ease-in-out infinite",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full opacity-10"
            style={{
              width: 160,
              height: 160,
              bottom: -60,
              left: -50,
              border: `2px solid ${spec.fg}`,
              animation: "house-ad-float 7s ease-in-out infinite",
            }}
          />

          <span
            className="relative z-10 mt-4 flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: spec.accent, animation: "house-ad-bob 3.5s ease-in-out infinite" }}
          >
            <Icon style={{ color: spec.badgeIcon, width: 28, height: 28 }} />
          </span>

          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: spec.accent }}>
              {spec.kicker}
            </span>
            <h3 className="font-heading text-balance text-base leading-tight font-bold" style={{ color: spec.fg }}>
              {spec.title}
            </h3>
            <p className="text-xs opacity-80" style={{ color: spec.fg }}>
              {spec.sub}
            </p>
          </div>

          <span
            className="relative z-10 mb-4 inline-flex w-fit items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-md transition-transform group-hover:scale-105"
            style={{ background: spec.accent, color: spec.badgeIcon }}
          >
            {spec.cta} →
          </span>
        </Link>
        <HouseAdKeyframes />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-3xl px-6", className)}>
      <Link
        href={spec.href}
        className={cn(
          "group relative flex overflow-hidden rounded-lg border shadow-sm transition-transform duration-300 hover:-translate-y-0.5",
          spec.tall ? "aspect-[4/5] flex-col items-center justify-center gap-4 p-8 text-center" : "items-center gap-6 p-7",
        )}
        style={{
          background: spec.bg,
          backgroundSize: "200% 200%",
          borderColor: "color-mix(in oklch, " + spec.fg + ", transparent 80%)",
          animation: "house-ad-drift 10s ease-in-out infinite",
        }}
      >
        <span
          className="pointer-events-none absolute top-3 right-4 z-10 rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
          style={{ color: spec.fg, background: "rgb(0 0 0 / 0.16)" }}
        >
          Reklam
        </span>

        {/* Diagonal light sweep - the "hareketli" (alive/moving) feel the
            customer explicitly asked for, real HTML/CSS not a static image. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full"
          style={{
            background: "linear-gradient(75deg, transparent 40%, rgb(255 255 255 / 0.16) 50%, transparent 60%)",
            animation: "house-ad-sweep 5s ease-in-out infinite",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full opacity-10"
          style={{
            width: spec.tall ? 260 : 200,
            height: spec.tall ? 260 : 200,
            top: spec.tall ? -80 : -70,
            right: spec.tall ? -80 : -60,
            border: `2px solid ${spec.fg}`,
            animation: "house-ad-float 7s ease-in-out infinite",
          }}
        />

        <span
          className="relative z-10 flex shrink-0 items-center justify-center rounded-2xl shadow-lg"
          style={{
            width: spec.tall ? 88 : 72,
            height: spec.tall ? 88 : 72,
            background: spec.accent,
            animation: "house-ad-bob 3.5s ease-in-out infinite",
          }}
        >
          <Icon style={{ color: spec.badgeIcon, width: spec.tall ? 42 : 34, height: spec.tall ? 42 : 34 }} />
        </span>

        <div className={cn("relative z-10 flex min-w-0 flex-col gap-1.5", spec.tall && "items-center")}>
          <div className={cn("flex items-center gap-2", spec.tall && "justify-center")}>
            <span className="font-heading text-sm font-semibold italic opacity-65" style={{ color: spec.fg }}>
              DKList
            </span>
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: spec.accent }}>
              {spec.kicker}
            </span>
          </div>
          <h3
            className={cn("font-heading font-bold text-balance", spec.tall ? "text-2xl" : "text-xl sm:text-2xl")}
            style={{ color: spec.fg }}
          >
            {spec.title}
          </h3>
          <p className={cn("text-sm opacity-85", spec.tall ? "max-w-xs" : "max-w-md")} style={{ color: spec.fg }}>
            {spec.sub}
          </p>
          <span
            className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition-transform group-hover:scale-105"
            style={{ background: spec.accent, color: spec.badgeIcon }}
          >
            {spec.cta}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
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
      @keyframes house-ad-sweep-v {
        0% { transform: translateY(-120%); }
        35%, 100% { transform: translateY(220%); }
      }
      @keyframes house-ad-float {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(10px) scale(1.04); }
      }
      @keyframes house-ad-bob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-5px) rotate(-3deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        a[style], span[style] { animation: none !important; }
      }
    `}</style>
  );
}
