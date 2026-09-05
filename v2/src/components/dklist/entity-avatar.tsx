import { MedalIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { cn } from "@/lib/utils";
import { avatarUrl } from "@/lib/image-urls";
import { ProfileFrameRing } from "@/components/dklist/profile-frame-ring";
import type { FrameTier } from "@/lib/profile-frame-tier";

/**
 * Writer/translator/publisher listing pages (yazarlar, cevirmenler,
 * yayinevleri) rendered every single entry as an identical gray-circle
 * initials avatar - a real, flagged-by-name visual flatness ("hep aynı
 * gri daire") next to the rest of the site's tone-colored BookCover
 * jackets. Reuses that exact same deterministic tone palette (toneForId)
 * so a writer/translator/publisher grid reads as part of the same
 * editorial system instead of a generic admin-table look, with zero new
 * design tokens to maintain.
 *
 * Also the one shared small-avatar component used for every real *user*
 * avatar site-wide (comments, feed, messages, sidebars) - `profileFrame`/
 * `frameTier`/`highestBadge` are optional specifically so entity (writer/
 * translator/publisher) call sites, which have neither concept, render
 * exactly as before with zero visual change. Customer's ask (2026-09-03):
 * "çerçeveler heryerde gözüksün, en yüksek rozet de gözüksün" - the
 * purchasable frame ring (built for the profile page) and a person's
 * single highest milestone badge should both show wherever their avatar
 * appears, not just on their own profile. Callers get this data from
 * `getUserDecorations()` (a single batch lookup per list, see that file's
 * doc comment) and pass it through here.
 */
export function EntityAvatar({
  id,
  name,
  image,
  imageUrl,
  className,
  size = "size-9",
  profileFrame,
  frameTier,
  highestBadge,
}: {
  id: number;
  name: string;
  /** A bare uploaded filename served through the *user* avatar proxy
   * (`/api/avatar/[filename]`) - correct for every real person (comments,
   * feed, messages...). */
  image?: string | null;
  /** An already-resolved image URL, for entities with their own separate
   * image route (writer/translator, `/api/writer-image/…` etc. via
   * image-urls.ts's own helpers) - real bug found via customer report
   * ("Sabahattin Ali'de ise ekli görünüyor ama girince göstermiyor"):
   * getWriterBySlug() never even selected `writer.img` from the DB, and
   * even if it had, passing it into `image` would have built the wrong
   * URL (the user-avatar route, not the writer one). Takes priority over
   * `image` when both are somehow passed. */
  imageUrl?: string | null;
  className?: string;
  size?: string;
  profileFrame?: string | null;
  frameTier?: FrameTier;
  highestBadge?: { name: string; threshold: number } | null;
}) {
  const tone = toneForId(id);
  const t = TONE_STYLE[tone];
  // `image` is a bare uploaded filename (e.g. "8e4f...webp"), same
  // convention as every other `user.image` value site-wide - resolve it
  // through the real proxy route here rather than requiring every call
  // site to remember to (see avatarUrl()'s own doc comment for the real
  // bug this fixes).
  const resolvedSrc = imageUrl ?? avatarUrl(image);
  const px = sizeClassToPx(size);

  const avatar = (
    <Avatar className={cn(size, "text-sm", className)}>
      {resolvedSrc && <AvatarImage src={resolvedSrc} />}
      <AvatarFallback style={{ backgroundColor: t.bg, color: t.fg }}>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );

  const framed = profileFrame ? (
    <ProfileFrameRing color={profileFrame} size={px} ringWidth={Math.max(2, Math.round(px * 0.09))} tier={frameTier}>
      {avatar}
    </ProfileFrameRing>
  ) : (
    avatar
  );

  if (!highestBadge) return framed;

  return (
    <span className="relative inline-flex shrink-0">
      {framed}
      <BadgeMark threshold={highestBadge.threshold} name={highestBadge.name} size={px} />
    </span>
  );
}

/** Tailwind's `size-N` utility is `N * 0.25rem` (4px at the default 16px
 * root) - parsed here so the frame ring can size itself in real pixels to
 * match whatever class each call site already passes. Falls back to the
 * component's own `size-9` default on anything unparseable. */
function sizeClassToPx(sizeClass: string): number {
  const match = /^size-(\d+(?:\.\d+)?)$/.exec(sizeClass);
  return match ? Number(match[1]) * 4 : 36;
}

function badgeTierColor(threshold: number): string {
  if (threshold >= 500) return "oklch(0.58 0.19 335)"; // Efsanevi - rich magenta
  if (threshold >= 250) return "oklch(0.78 0.13 85)"; // gold
  if (threshold >= 100) return "oklch(0.75 0.015 250)"; // silver
  return "oklch(0.62 0.1 50)"; // bronze
}

function BadgeMark({ threshold, name, size }: { threshold: number; name: string; size: number }) {
  const color = badgeTierColor(threshold);
  const dot = Math.max(13, Math.round(size * 0.34));
  return (
    <span
      title={name}
      className="absolute right-0 bottom-0 z-20 flex items-center justify-center rounded-full ring-2 ring-background"
      style={{ width: dot, height: dot, background: color }}
    >
      <MedalIcon style={{ width: dot * 0.62, height: dot * 0.62, color: "white" }} strokeWidth={2.25} />
    </span>
  );
}
