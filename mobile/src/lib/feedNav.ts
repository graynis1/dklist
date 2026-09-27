import type { Href } from "expo-router";
import type { FeedItem } from "@/api/feed";

/** Maps a feed item's web-shaped `targetHref` (set by the same feed.ts the
 * web /akis page uses) to the matching mobile route, or null when the app
 * has no screen for it. */
export function resolveFeedTargetHref(item: FeedItem): Href | null {
  const href = item.targetHref;
  if (!href) return null;

  const routes: [RegExp, (m: string) => Href][] = [
    [/^\/kitap\/(.+)$/, (slug) => ({ pathname: "/kitap/[slug]", params: { slug } })],
    [/^\/yazar\/(.+)$/, (slug) => ({ pathname: "/yazar/[slug]", params: { slug } })],
    [/^\/cevirmen\/(.+)$/, (slug) => ({ pathname: "/cevirmen/[slug]", params: { slug } })],
    [/^\/yayinevi\/(.+)$/, (slug) => ({ pathname: "/yayinevi/[slug]", params: { slug } })],
    [/^\/kulup\/(.+)$/, (slug) => ({ pathname: "/kulup/[slug]", params: { slug } })],
    [/^\/blog\/(.+)$/, (slug) => ({ pathname: "/blog/[slug]", params: { slug } })],
    [/^\/askida-kitap\/(.+)$/, (slug) => ({ pathname: "/askida-kitap/[slug]", params: { slug } })],
    [/^\/yazarhane\/(.+)$/, (username) => ({ pathname: "/yazarhane/[username]", params: { username: decodeURIComponent(username) } })],
    [/^\/profil\/(.+)$/, (username) => ({ pathname: "/profil/[username]", params: { username: decodeURIComponent(username) } })],
  ];
  for (const [re, to] of routes) {
    const m = href.match(re);
    if (m) return to(m[1]);
  }
  return null;
}

export function actorProfileHref(item: FeedItem): Href {
  return { pathname: "/profil/[username]", params: { username: item.actorUsername } };
}
