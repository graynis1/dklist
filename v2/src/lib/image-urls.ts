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
  if (!image) return null;
  // Some legacy `user.image` values are full Cloudinary URLs (imported, never
  // written by saveUploadedImage) - passing those through the /api/avatar/
  // proxy produces `/api/avatar/https://res.cloudinary.com/...` which 404s
  // and logs a console error. Same two-formats-in-one-column shape as
  // sitePopupImageUrl / blogImageUrl.
  if (/^https?:\/\//i.test(image)) {
    // Cloudinary serves these at native size (~100+ KiB for a ~48px avatar);
    // inject a resize+format transform right after `/upload/` so it matches
    // what the local /api/avatar proxy now does for uploaded avatars. Only
    // touched when no transform is already present (…/upload/v123/…).
    if (image.includes("res.cloudinary.com") && /\/upload\/v\d/.test(image)) {
      return image.replace("/upload/", "/upload/w_192,h_192,c_fill,f_auto,q_auto/");
    }
    return image;
  }
  return `/api/avatar/${image}`;
}

export function feedPostImageUrl(filename: string): string {
  return `/api/feed-post-image/${filename}`;
}

/**
 * Real customer report: a writer's admin-uploaded photo ("Sabahattin
 * Ali'de ise ekli görünüyor ama girince göstermiyor sayfada resmini")
 * never appeared on the real writer page. Root cause: getWriterBySlug()
 * never selected `writer.img` at all, and the admin-only preview
 * (writer-admin-row.tsx) built its own `/api/writer-image/${img}` URL
 * inline rather than through a shared helper - no publicly-reachable code
 * path ever resolved a writer's photo URL. Same for translators
 * (translator-admin-row.tsx had the identical inline pattern, same gap).
 */
export function writerImageUrl(filename: string | null | undefined): string | null {
  return filename ? `/api/writer-image/${filename}` : null;
}

export function translatorImageUrl(filename: string | null | undefined): string | null {
  return filename ? `/api/translator-image/${filename}` : null;
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
