import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/mesajlar", "/bildirimler", "/profil/duzenle", "/hesap/"],
      },
    ],
    sitemap: "https://dklist.com/sitemap.xml",
  };
}
