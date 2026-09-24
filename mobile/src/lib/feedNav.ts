import type { Href } from "expo-router";
import type { FeedItem } from "@/api/feed";

/**
 * Maps a feed item's web-shaped `targetHref` (e.g. `/kitap/some-slug`,
 * set by the same `feed.ts` the web `/akis` page uses) to the matching
 * mobile route. Only the entity kinds with a real mobile detail screen so
 * far resolve to something; everything else (blog/store/club posts) is
 * deliberately left null rather than guessing a route that doesn't exist.
 */
export function resolveFeedTargetHref(item: FeedItem): Href | null {
  const href = item.targetHref;
  if (!href) return null;

  const kitap = href.match(/^\/kitap\/(.+)$/);
  if (kitap) return { pathname: "/kitap/[slug]", params: { slug: kitap[1] } };

  const yazar = href.match(/^\/yazar\/(.+)$/);
  if (yazar) return { pathname: "/yazar/[slug]", params: { slug: yazar[1] } };

  const cevirmen = href.match(/^\/cevirmen\/(.+)$/);
  if (cevirmen) return { pathname: "/cevirmen/[slug]", params: { slug: cevirmen[1] } };

  const yayinevi = href.match(/^\/yayinevi\/(.+)$/);
  if (yayinevi) return { pathname: "/yayinevi/[slug]", params: { slug: yayinevi[1] } };

  const profil = href.match(/^\/profil\/(.+)$/);
  if (profil) return { pathname: "/profil/[username]", params: { username: decodeURIComponent(profil[1]) } };

  return null;
}

export function actorProfileHref(item: FeedItem): Href {
  return { pathname: "/profil/[username]", params: { username: item.actorUsername } };
}
