import type { CSSProperties, ReactNode } from "react";
import { CrownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { frameTierFromPointCost, type FrameTier } from "@/lib/profile-frame-tier";
import { sunburstClipPath } from "@/lib/sunburst-clip-path";

/**
 * Renders a purchasable profile frame (Puan Mağazası, `profile_frame`
 * rewards - Bronz/Gümüş/Zümrüt/Ametist/Yakut/Safir/Altın/Elmas Çerçeve),
 * tiered by point cost.
 *
 * Third pass (2026-09-03). Customer's feedback on the second pass, after
 * seeing it live: "sadece renkleri farklı çerçeveler var... yükseldikçe
 * şekilli heybetli şekilde olsa" (they're still just differently-colored
 * [rings] - going up in tier should make the SHAPE itself grander/more
 * ornate). Fair - tier 2/3/4 were the same circular ring with escalating
 * decoration (facets, glow, sparkles) but never a different silhouette.
 * Real reward-frame systems in games (Mobile Legends/PUBG Mobile avatar
 * frames, Steam rare profile frames, Discord avatar decorations) escalate
 * exactly this way: low tiers are a plain ring, high tiers break out of
 * the circle entirely - radiant medallion "sunburst" halos, an emblem
 * (crown/wings/gem) perched on top, layered depth. Rebuilt around that
 * reference instead of only varying color/glow:
 *   Tier 1 (Standart)    - plain rotating ring, one glint. Unchanged silhouette.
 *   Tier 2 (Değerli)     - adds an inner accent line AND four small gem
 *                          studs at the compass points - still a circle,
 *                          but visibly bezel-set/jeweled now.
 *   Tier 3 (Ayrıcalıklı) - breaks the circle: a scalloped "sunburst" halo
 *                          (a real generated star/gear polygon, not part of
 *                          the ring) sits behind it, rotating independently,
 *                          plus the multi-facet gradient and a glow pulse.
 *   Tier 4 (Efsanevi)    - a larger, sharper sunburst halo, a small crown
 *                          emblem perched above the ring, and three
 *                          orbiting twinkling sparkles - the full
 *                          medallion, currently Elmas alone.
 */
export function ProfileFrameRing({
  color,
  size,
  ringWidth = 4,
  pointCost,
  tier: tierOverride,
  className,
  children,
}: {
  color: string;
  size: number;
  ringWidth?: number;
  pointCost?: number | null;
  /** Precomputed tier - skips the pointCost lookup. Callers already
   * batch-resolving decorations for a whole list (see `getUserDecorations`)
   * pass this instead of pointCost, so the tier isn't recomputed per row. */
  tier?: FrameTier;
  className?: string;
  children: ReactNode;
}) {
  const tier = tierOverride ?? frameTierFromPointCost(pointCost);
  // Small inline avatars (comments, feed, messages, sidebars - every
  // `EntityAvatar` site-wide) can't fit a spiky halo/crown without
  // overlapping neighboring text or looking cluttered at that density -
  // the full medallion spectacle stays reserved for the one prominent
  // profile-page avatar (96px+), matching how real reward-frame systems
  // (Discord decorations, game avatar frames) size down their in-list
  // representation while keeping the showcase version on the profile.
  const compact = size < 60;
  const rw = ringWidth + (!compact && tier >= 4 ? 2 : !compact && tier >= 3 ? 1 : 0);
  const outer = size + rw * 2;
  const vars = { "--frame-color": color } as CSSProperties;

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: outer, height: outer, ...vars }}>
      {tier >= 3 && !compact && <Sunburst outer={outer} big={tier >= 4} color={color} />}

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

      {tier >= 2 &&
        [0, 90, 180, 270].map((angle) => <GemStud key={angle} angle={angle} outer={outer} rw={rw} color={color} />)}

      {tier >= 4 && !compact && (
        <>
          <Sparkle angle={-135} delay={0} size={size} rw={rw} />
          <Sparkle angle={40} delay={0.9} size={size} rw={rw} />
          <Sparkle angle={155} delay={1.8} size={size} rw={rw} />
          <CrownIcon
            aria-hidden
            className="profile-frame-crown pointer-events-none absolute z-30"
            style={{
              width: size * 0.3,
              height: size * 0.3,
              top: -size * 0.17,
              left: "50%",
              transform: "translateX(-50%)",
              color: "white",
              fill: "color-mix(in oklch, var(--frame-color), white 25%)",
              filter: `drop-shadow(0 0 5px ${color})`,
            }}
          />
        </>
      )}

      <span className="relative z-10 flex items-center justify-center">{children}</span>
      <ProfileFrameKeyframes />
    </span>
  );
}

function Sunburst({ outer, big, color }: { outer: number; big: boolean; color: string }) {
  const scale = big ? 1.42 : 1.2;
  const d = outer * scale;
  const clip = big ? sunburstClipPath(14, 0.78) : sunburstClipPath(10, 0.87);
  return (
    <span
      aria-hidden
      className={cn("absolute", big ? "profile-frame-sunburst--big" : "profile-frame-sunburst")}
      style={{
        width: d,
        height: d,
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        clipPath: clip,
        background: `radial-gradient(circle, ${color}, color-mix(in oklch, ${color}, black 55%))`,
        filter: `drop-shadow(0 0 ${big ? 10 : 6}px color-mix(in oklch, ${color}, transparent 20%))`,
      }}
    />
  );
}

function GemStud({ angle, outer, rw, color }: { angle: number; outer: number; rw: number; color: string }) {
  const radius = outer / 2;
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;
  const s = Math.max(4, rw * 0.9);
  return (
    <span
      aria-hidden
      className="absolute z-10"
      style={{
        width: s,
        height: s,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: "translate(-50%, -50%) rotate(45deg)",
        background: `color-mix(in oklch, ${color}, white 55%)`,
        boxShadow: `0 0 0 1px color-mix(in oklch, ${color}, black 40%), 0 0 4px ${color}`,
        borderRadius: 2,
      }}
    />
  );
}

function Sparkle({ angle, delay, size, rw }: { angle: number; delay: number; size: number; rw: number }) {
  const radius = size / 2 + rw + 4;
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
      .profile-frame-sunburst, .profile-frame-sunburst--big {
        animation: profile-frame-spin-rev 16s linear infinite;
        opacity: 0.9;
      }
      .profile-frame-sunburst--big {
        animation-duration: 12s;
        opacity: 0.95;
      }
      .profile-frame-crown {
        animation: profile-frame-crown-bob 3.2s ease-in-out infinite;
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
      @keyframes profile-frame-spin-rev {
        from { transform: translate(-50%, -50%) rotate(360deg); }
        to { transform: translate(-50%, -50%) rotate(0deg); }
      }
      @keyframes profile-frame-pulse {
        from { box-shadow: 0 0 10px -2px var(--frame-color); }
        to { box-shadow: 0 0 22px 1px var(--frame-color); }
      }
      @keyframes profile-frame-crown-bob {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-3px); }
      }
      @keyframes profile-frame-twinkle {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .profile-frame-ring, .profile-frame-ring--pulse, .profile-frame-sparkle,
        .profile-frame-sunburst, .profile-frame-sunburst--big, .profile-frame-crown { animation: none; }
      }
    `}</style>
  );
}
