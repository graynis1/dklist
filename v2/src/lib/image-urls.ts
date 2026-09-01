/**
 * Pure URL-building helpers with no server dependency - split out after the
 * same build failure documented in roles.ts: a client component
 * (ad-admin-row.tsx) importing advertisementImageUrl straight from
 * advertisements.ts (which has `import "server-only"`) pulled db/mysql2
 * into the client bundle. Keep any future "just builds a /api/.../
 * [filename] path" helper here instead of in its query module if a client
 * component will ever need it.
 */
export function advertisementImageUrl(filename: string): string {
  return `/api/advertisement-image/${filename}`;
}

/**
 * Real bug found while wiring real avatars into several widgets that
 * previously only showed initials: `EntityAvatar` (used everywhere - feed
 * actors, comment authors, message threads, blog owners, book readers...)
 * took its `image` prop and passed it straight to `<AvatarImage src=...>`
 * with no URL resolution at all - a bare uploaded filename like
 * "8e4f...webp" is not a valid image URL on its own, it needs the
 * `/api/avatar/[filename]` proxy prefix. Every one of those call sites was
 * silently falling back to initials, which is exactly the customer's
 * report ("resimli görünmesi daha dikkat çekici olabilir") - the underlying
 * `user.image` data was often already there, the URL was just never built.
 * Client-safe duplicate of db/queries/avatar.ts's own `avatarUrl()` (which
 * has `import "server-only"` and cannot be imported into EntityAvatar,
 * used from client components) - same one-line logic, kept in sync by
 * being this simple.
 */
export function avatarUrl(image: string | null | undefined): string | null {
  return image ? `/api/avatar/${image}` : null;
}

export function feedPostImageUrl(filename: string): string {
  return `/api/feed-post-image/${filename}`;
}

/**
 * Real customer-reported bug: the homepage announcement popup showed a
 * broken image ("hatalı görsel gibi görünüyor"). Root cause: `site_popup.
 * image` holds a full Cloudinary URL (a legacy/imported value, not
 * something saveUploadedImage() ever wrote), while the component always
 * prefixed it with `/api/site-popup-image/`, producing a nonsense URL like
 * `/api/site-popup-image/https://res.cloudinary.com/...`. Same "two
 * coexisting formats in one column" shape as blogImageUrl()'s Cloudinary-
 * vs-filename fix earlier this session - detect and pass a real URL
 * through unchanged instead of assuming every value is a bare filename.
 */
export function sitePopupImageUrl(image: string): string {
  return /^https?:\/\//i.test(image) ? image : `/api/site-popup-image/${image}`;
}
