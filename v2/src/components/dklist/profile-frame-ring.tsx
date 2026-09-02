import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a purchasable profile frame (Puan Mağazası, `profile_frame`
 * rewards - Bronz/Gümüş/Zümrüt/Ametist/Yakut/Safir/Altın/Elmas Çerçeve) as
 * an actual designed ring, not the flat single-color outline it was
 * before. Customer's direct feedback (2026-09-03, same session as the ad
 * redesign): "puan ile satın alınabilen çerçeveler... gerçekten havalı ve
 * mükemmel/ayrıcalıklı görünen çerçevelere ihtiyacımız var" - a flat
 * `border-4`/`boxShadow: 0 0 0 3px <color>` ring gives someone zero reason
 * to grind points for it; a purchasable status symbol has to actually look
 * worth chasing.
 *
 * Every frame reward's `rewardValue` is a single CSS color (admin-entered
 * via the point-store admin form) - rather than hand-authoring a bespoke
 * design per color (fragile: breaks the moment an admin adds a 9th tier),
 * the ring is derived programmatically from that one color: a slowly
 * rotating conic "brushed metal" gradient (light/base/dark bands, like a
 * medal catching light) plus a soft matching glow. Any current or future
 * admin-added color gets the same premium treatment for free, with zero
 * schema/reward-data change needed.
 */
export function ProfileFrameRing({
  color,
  size,
  ringWidth = 4,
  className,
  children,
}: {
  color: string;
  size: number;
  ringWidth?: number;
  className?: string;
  children: ReactNode;
}) {
  const vars = { "--frame-color": color } as CSSProperties;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size + ringWidth * 2, height: size + ringWidth * 2, ...vars }}
    >
      <span
        aria-hidden
        className="profile-frame-ring absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 10px -2px ${color}` }}
      />
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      <ProfileFrameKeyframes />
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
      @keyframes profile-frame-spin {
        to { transform: rotate(360deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .profile-frame-ring { animation: none; }
      }
    `}</style>
  );
}
