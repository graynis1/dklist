import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { frameTierFromPointCost } from "@/lib/profile-frame-tier";

/**
 * Renders a purchasable profile frame (Puan Mağazası, `profile_frame`
 * rewards - Bronz/Gümüş/Zümrüt/Ametist/Yakut/Safir/Altın/Elmas Çerçeve) as
 * an actual designed, tiered ring.
 *
 * First pass (2026-09-03) replaced the flat single-color outline with a
 * rotating metallic ring - customer's follow-up feedback: "hepsi bir renk
 * aq... adam gibi yüksek olanları mükemmel iyi yapsana" (they're all just
 * one color - make the expensive ones look genuinely excellent). Every
 * tier used the identical treatment regardless of price, so a 30-point
 * Bronz frame looked as good as an 800-point Elmas frame - no reason to
 * actually chase the expensive ones.
 *
 * Now tiered by point cost (see `frameTierFromPointCost` - no schema
 * change, price alone decides the tier): each step up is a strictly
 * richer, more deliberate visual than the last, not just a recolor -
 * exactly what makes a purchasable status symbol worth grinding for.
 *   Tier 1 (Standart)    - the base rotating ring with one glint.
 *   Tier 2 (Değerli)     - adds a slim bright inner accent line (double ring).
 *   Tier 3 (Ayrıcalıklı) - upgrades to a multi-facet "cut gem" gradient and
 *                          a slow breathing glow, on top of tier 2.
 *   Tier 4 (Efsanevi)    - adds orbiting twinkling sparkles and a wider
 *                          band on top of tier 3 - the full showpiece,
 *                          currently Elmas alone.
 */
export function ProfileFrameRing({
  color,
  size,
  ringWidth = 4,
  pointCost,
  className,
  children,
}: {
  color: string;
  size: number;
  ringWidth?: number;
  pointCost?: number | null;
  className?: string;
  children: ReactNode;
}) {
  const tier = frameTierFromPointCost(pointCost);
  const rw = ringWidth + (tier >= 4 ? 2 : tier >= 3 ? 1 : 0);
  const outer = size + rw * 2;
  const vars = { "--frame-color": color } as CSSProperties;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: outer, height: outer, ...vars }}
    >
      <span
        aria-hidden
        className={cn("profile-frame-ring absolute inset-0 rounded-full", tier >= 3 && "profile-frame-ring--faceted profile-frame-ring--pulse")}
        style={{ boxShadow: `0 0 ${8 + tier * 3}px -2px ${color}` }}
      />
      {tier >= 2 && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{ inset: Math.max(2, rw * 0.4), boxShadow: `0 0 0 1px color-mix(in oklch, ${color}, white 45%)`, opacity: 0.9 }}
        />
      )}
      {tier >= 4 && (
        <>
          <Sparkle angle={-42} delay={0} size={size} rw={rw} />
          <Sparkle angle={75} delay={0.9} size={size} rw={rw} />
          <Sparkle angle={195} delay={1.8} size={size} rw={rw} />
        </>
      )}
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      <ProfileFrameKeyframes />
    </span>
  );
}

function Sparkle({ angle, delay, size, rw }: { angle: number; delay: number; size: number; rw: number }) {
  const radius = size / 2 + rw;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  return (
    <span
      aria-hidden
      className="profile-frame-sparkle pointer-events-none absolute z-20"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        fontSize: Math.max(8, Math.round(size * 0.11)),
        animationDelay: `${delay}s`,
      }}
    >
      ✦
    </span>
  );
}

function ProfileFrameKeyframes() {
  return (
    <style>{`
      .profile-frame-ring {
        /* Base color dominates most of the ring (stays clearly "that
           gem/metal's color" at a glance) with one dark band for depth and
           one bright near-white glint - like a single point of light
           catching a polished ring - rather than a smooth pastel blend
           that reads as a generic soft-colored halo. */
        background: conic-gradient(
          from 0deg,
          var(--frame-color) 0%,
          color-mix(in oklch, var(--frame-color), black 45%) 22%,
          var(--frame-color) 40%,
          color-mix(in oklch, var(--frame-color), white 85%) 50%,
          var(--frame-color) 60%,
          color-mix(in oklch, var(--frame-color), black 45%) 78%,
          var(--frame-color) 100%
        );
        animation: profile-frame-spin 6s linear infinite;
      }
      .profile-frame-ring.profile-frame-ring--faceted {
        /* Tier 3+: several alternating light/dark facets instead of one
           glint - reads as a cut gemstone catching light from multiple
           angles, not a single smooth highlight. */
        background: conic-gradient(
          from 0deg,
          var(--frame-color) 0%,
          color-mix(in oklch, var(--frame-color), white 82%) 6%,
          var(--frame-color) 13%,
          color-mix(in oklch, var(--frame-color), black 48%) 26%,
          var(--frame-color) 37%,
          color-mix(in oklch, var(--frame-color), white 88%) 50%,
          var(--frame-color) 63%,
          color-mix(in oklch, var(--frame-color), black 48%) 74%,
          var(--frame-color) 87%,
          color-mix(in oklch, var(--frame-color), white 82%) 94%,
          var(--frame-color) 100%
        );
      }
      .profile-frame-ring--pulse {
        animation:
          profile-frame-spin 6s linear infinite,
          profile-frame-pulse 2.4s ease-in-out infinite alternate;
      }
      .profile-frame-sparkle {
        transform: translate(-50%, -50%);
        color: white;
        text-shadow: 0 0 3px white, 0 0 7px var(--frame-color);
        animation: profile-frame-twinkle 2.6s ease-in-out infinite;
      }
      @keyframes profile-frame-spin {
        to { transform: rotate(360deg); }
      }
      @keyframes profile-frame-pulse {
        from { box-shadow: 0 0 10px -2px var(--frame-color); }
        to { box-shadow: 0 0 22px 1px var(--frame-color); }
      }
      @keyframes profile-frame-twinkle {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .profile-frame-ring, .profile-frame-ring--pulse, .profile-frame-sparkle { animation: none; }
      }
    `}</style>
  );
}
