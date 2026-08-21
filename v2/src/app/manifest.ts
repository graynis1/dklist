import type { MetadataRoute } from "next";

/**
 * PWA support - ninth item from the "what else could be added" brainstorm
 * list. A reading app is a natural fit for "add to home screen" -
 * standalone display removes the browser chrome, closer to a real app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DKList - Kitap Severlerin Buluştuğu Adres",
    short_name: "DKList",
    description: "Kitap keşfet, okuma durumunu takip et, topluluğa katıl.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ded1",
    theme_color: "#3a1810",
    lang: "tr",
    icons: [
      { src: "/manifest-icon-192", sizes: "192x192", type: "image/png" },
      { src: "/manifest-icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
