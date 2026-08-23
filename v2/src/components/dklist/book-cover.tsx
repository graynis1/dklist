import { cn } from "@/lib/utils";
import { PhotoBookCover } from "@/components/dklist/photo-book-cover";

export type BookCoverTone =
  | "oxblood"
  | "dusk"
  | "ochre"
  | "sage"
  | "ink"
  | "olive"
  | "terracotta"
  | "teal"
  | "plum"
  | "mustard";

const TONE_STYLE: Record<BookCoverTone, { bg: string; fg: string; rule: string }> = {
  oxblood: { bg: "oklch(0.32 0.1 22)", fg: "oklch(0.96 0.02 60)", rule: "oklch(0.6 0.12 30 / 55%)" },
  dusk: { bg: "oklch(0.34 0.05 250)", fg: "oklch(0.96 0.01 90)", rule: "oklch(0.65 0.06 250 / 55%)" },
  ochre: { bg: "oklch(0.62 0.11 75)", fg: "oklch(0.18 0.02 60)", rule: "oklch(0.3 0.05 60 / 45%)" },
  sage: { bg: "oklch(0.45 0.06 150)", fg: "oklch(0.96 0.02 100)", rule: "oklch(0.7 0.08 150 / 50%)" },
  ink: { bg: "oklch(0.22 0.01 55)", fg: "oklch(0.95 0.01 75)", rule: "oklch(0.5 0.02 55 / 55%)" },
  olive: { bg: "oklch(0.4 0.06 115)", fg: "oklch(0.95 0.02 95)", rule: "oklch(0.65 0.08 115 / 50%)" },
  terracotta: { bg: "oklch(0.5 0.15 42)", fg: "oklch(0.98 0.01 75)", rule: "oklch(0.75 0.1 50 / 55%)" },
  teal: { bg: "oklch(0.4 0.06 195)", fg: "oklch(0.96 0.02 100)", rule: "oklch(0.68 0.07 195 / 50%)" },
  plum: { bg: "oklch(0.34 0.09 335)", fg: "oklch(0.96 0.02 60)", rule: "oklch(0.62 0.1 335 / 50%)" },
  mustard: { bg: "oklch(0.65 0.13 90)", fg: "oklch(0.2 0.03 70)", rule: "oklch(0.35 0.06 80 / 45%)" },
};

const ALL_TONES: BookCoverTone[] = [
  "oxblood",
  "dusk",
  "ochre",
  "sage",
  "ink",
  "olive",
  "terracotta",
  "teal",
  "plum",
  "mustard",
];

/** Deterministic tone assignment for real book records (no tone stored in the DB). */
export function toneForId(id: number): BookCoverTone {
  return ALL_TONES[id % ALL_TONES.length];
}

interface BookCoverProps {
  title: string;
  author: string;
  tone: BookCoverTone;
  size?: "sm" | "md" | "lg";
  className?: string;
  rotate?: number;
  /** Real book id - required (with hasImage) to attempt the real cover photo. */
  bookId?: number;
  /** Whether this book has a real source cover (`book.image` is set). When
   * true, a real photo is fetched via the /kapak/[id] proxy and shown instead
   * of the typeset jacket below; falls back to the jacket if the photo fails
   * to load (a stored source URL that 404s at the origin, same ~40% real-
   * coverage ceiling v1 always had - not every book with a source URL
   * actually has a live image behind it). */
  hasImage?: boolean;
}

const SIZE_CLASS: Record<NonNullable<BookCoverProps["size"]>, string> = {
  sm: "w-28 text-[0.6rem]",
  md: "w-40 text-xs",
  lg: "w-56 text-sm",
};

/**
 * Real photo when available (proxied through /kapak/[id] so the real Open
 * Library/Amazon origin is never exposed to the client), falling back to the
 * typeset "jacket" design below when a book has no real source cover, or its
 * real cover fails to load.
 */
export function BookCover({
  title,
  author,
  tone,
  size = "md",
  className,
  rotate = 0,
  bookId,
  hasImage,
}: BookCoverProps) {
  const t = TONE_STYLE[tone];
  const showPhoto = hasImage && bookId != null;

  const wrapperClassName = cn(
    "group relative aspect-[2/3] shrink-0 overflow-hidden rounded-[0.35rem] shadow-[0_1px_2px_rgba(0,0,0,0.15),0_12px_28px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/10 transition-transform duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_24px_40px_-16px_rgba(0,0,0,0.55)]",
    SIZE_CLASS[size],
    className,
  );

  const typesetJacket = (
    <div
      className={wrapperClassName}
      style={{ backgroundColor: t.bg, color: t.fg, transform: `rotate(${rotate}deg)` }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-[10%]">
        <div
          className="h-px w-full opacity-80"
          style={{ backgroundColor: t.rule }}
        />
        <div className="flex flex-col gap-1">
          <p className="font-heading leading-[1.05] font-medium text-balance">
            {title}
          </p>
          <p
            className="text-[0.85em] tracking-wide uppercase opacity-80"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {author}
          </p>
        </div>
        <div
          className="h-px w-full opacity-80"
          style={{ backgroundColor: t.rule }}
        />
      </div>
      {/* subtle top sheen so the flat color still reads as a physical jacket */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />
    </div>
  );

  if (showPhoto) {
    return (
      <PhotoBookCover
        src={`/kapak/${bookId}`}
        alt={`${title} - ${author}`}
        wrapperClassName={wrapperClassName}
        rotate={rotate}
        fallback={typesetJacket}
      />
    );
  }

  return typesetJacket;
}
