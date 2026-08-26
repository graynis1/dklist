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

export function feedPostImageUrl(filename: string): string {
  return `/api/feed-post-image/${filename}`;
}
