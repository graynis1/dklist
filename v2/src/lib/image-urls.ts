/**
 * Pure URL-building helpers with no server dependency - split out after the
 * same build failure documented in roles.ts: a client component
 * (ad-admin-row.tsx) importing advertisementImageUrl straight from
 * advertisements.ts (which has `import "server-only"`) pulled db/mysql2
 * into the client bundle. Keep any future "just builds a /api/.../
 * [filename] path" helper here instead of in its query module if a client
 * component will ever need it.
 *
 * Found (2026-08-25, cloud sandbox) that this same "just builds a path"
 * pattern had independently grown 7 more copies across the codebase instead
 * of following this file's own guidance: three query modules
 * (avatar.ts/store.ts/blog.ts) each defined an identical nullable-input
 * wrapper, one server module (messages.ts) inlined store's version a second
 * time rather than importing it, and four client components (badge/writer/
 * translator-admin-row.tsx, site-popup-settings-form.tsx,
 * site-popup-modal.tsx) inlined the raw template literal directly - the
 * exact class of duplication this file exists to prevent, just never
 * finished for these entities. Consolidated here; the query modules now
 * re-export these instead of redefining them, so there is exactly one
 * `/api/{x}-image/${filename}` builder per entity.
 */
export function advertisementImageUrl(filename: string): string {
  return `/api/advertisement-image/${filename}`;
}

export function avatarImageUrl(image: string | null): string | null {
  return image ? `/api/avatar/${image}` : null;
}

export function storeImageUrl(imageName: string | null): string | null {
  return imageName ? `/api/store-image/${imageName}` : null;
}

export function blogImageUrl(image: string | null): string | null {
  return image ? `/api/blog-image/${image}` : null;
}

export function badgeImageUrl(filename: string): string {
  return `/api/badge-image/${filename}`;
}

export function writerImageUrl(filename: string): string {
  return `/api/writer-image/${filename}`;
}

export function translatorImageUrl(filename: string): string {
  return `/api/translator-image/${filename}`;
}

export function sitePopupImageUrl(filename: string): string {
  return `/api/site-popup-image/${filename}`;
}

export function feedPostImageUrl(filename: string): string {
  return `/api/feed-post-image/${filename}`;
}
