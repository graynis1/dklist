import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toneForId, TONE_STYLE } from "@/components/dklist/book-cover";
import { cn } from "@/lib/utils";
import { avatarUrl } from "@/lib/image-urls";

/**
 * Writer/translator/publisher listing pages (yazarlar, cevirmenler,
 * yayinevleri) rendered every single entry as an identical gray-circle
 * initials avatar - a real, flagged-by-name visual flatness ("hep aynı
 * gri daire") next to the rest of the site's tone-colored BookCover
 * jackets. Reuses that exact same deterministic tone palette (toneForId)
 * so a writer/translator/publisher grid reads as part of the same
 * editorial system instead of a generic admin-table look, with zero new
 * design tokens to maintain.
 */
export function EntityAvatar({
  id,
  name,
  image,
  className,
  size = "size-9",
}: {
  id: number;
  name: string;
  image?: string | null;
  className?: string;
  size?: string;
}) {
  const tone = toneForId(id);
  const t = TONE_STYLE[tone];
  // `image` is a bare uploaded filename (e.g. "8e4f...webp"), same
  // convention as every other `user.image` value site-wide - resolve it
  // through the real proxy route here rather than requiring every call
  // site to remember to (see avatarUrl()'s own doc comment for the real
  // bug this fixes).
  const resolvedSrc = avatarUrl(image);
  return (
    <Avatar className={cn(size, "text-sm", className)}>
      {resolvedSrc && <AvatarImage src={resolvedSrc} />}
      <AvatarFallback style={{ backgroundColor: t.bg, color: t.fg }}>
        {name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
