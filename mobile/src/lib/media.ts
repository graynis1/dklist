import { API_BASE_URL } from "@/api/config";

/** The API returns uploaded media as site-relative paths ("/api/store-image/x.webp",
 * "/api/blog-image/x.webp"), occasionally as absolute URLs, and older blog rows as
 * a bare filename - resolve all three to something <Image> can load. */
export function mediaUrl(path: string | null | undefined, bareFilePrefix = "/api/blog-image/"): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}${bareFilePrefix}${path}`;
}
