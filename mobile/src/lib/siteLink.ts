import type { Href } from "expo-router";

/**
 * Turns a site-relative link the backend hands out ("/kulup/slug",
 * "/mesajlar?user=x", "/siparislerim", ...) into the matching app screen,
 * or null when the app has no screen for it.
 */
export function routeForSiteLink(link: string | null | undefined): Href | null {
  if (!link || !link.startsWith("/")) return null;
  const [path, query = ""] = link.split("?");
  const params = new URLSearchParams(query);

  const detail: [RegExp, (slug: string) => Href][] = [
    [/^\/kitap\/([^/]+)$/, (slug) => ({ pathname: "/kitap/[slug]", params: { slug } })],
    [/^\/yazar\/([^/]+)$/, (slug) => ({ pathname: "/yazar/[slug]", params: { slug } })],
    [/^\/cevirmen\/([^/]+)$/, (slug) => ({ pathname: "/cevirmen/[slug]", params: { slug } })],
    [/^\/yayinevi\/([^/]+)$/, (slug) => ({ pathname: "/yayinevi/[slug]", params: { slug } })],
    [/^\/kulup\/([^/]+)$/, (slug) => ({ pathname: "/kulup/[slug]", params: { slug } })],
    [/^\/blog\/([^/]+)$/, (slug) => ({ pathname: "/blog/[slug]", params: { slug } })],
    [/^\/video\/([^/]+)$/, (slug) => ({ pathname: "/video/[slug]", params: { slug } })],
    [/^\/liste\/([^/]+)$/, (slug) => ({ pathname: "/liste/[slug]", params: { slug } })],
    [/^\/askida-kitap\/([^/]+)$/, (slug) => ({ pathname: "/askida-kitap/[slug]", params: { slug } })],
    [/^\/kategori\/([^/]+)$/, (slug) => ({ pathname: "/kategori/[slug]", params: { slug } })],
    [/^\/yazarhane\/([^/]+)$/, (u) => ({ pathname: "/yazarhane/[username]", params: { username: decodeURIComponent(u) } })],
    [/^\/profil\/([^/]+)$/, (u) => ({ pathname: "/profil/[username]", params: { username: decodeURIComponent(u) } })],
  ];
  for (const [re, to] of detail) {
    const m = path.match(re);
    if (m) return to(m[1]);
  }

  if (path === "/mesajlar") {
    const user = params.get("user");
    return user ? { pathname: "/mesajlar/[username]", params: { username: user } } : "/mesajlar";
  }

  const plain: Record<string, Href> = {
    "/ilanlarim": "/ilanlarim",
    "/siparislerim": "/siparislerim",
    "/sepetim": "/sepetim",
    "/rozetler": "/rozetler",
    "/puan-tablosu": "/puan-tablosu",
    "/puan-magazasi": "/puan-magazasi",
    "/yazarhane": "/yazarhane",
    "/destek": "/destek",
    "/kulupler": "/kulupler",
    "/askida-kitap": "/askida-kitap",
    "/bloglar": "/bloglar",
    "/videolar": "/videolar",
    "/premium": "/premium",
    "/bildirimler": "/bildirimler",
    "/ayin-kitabi": "/ayin-kitabi",
    "/listeler": "/listeler",
    "/kitaplar": "/kitaplar",
  };
  return plain[path] ?? null;
}
