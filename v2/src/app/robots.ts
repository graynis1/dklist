import type { MetadataRoute } from "next";

/**
 * Real incident (2026-09-11): this 6-core / 11GB box runs a 92GB MySQL
 * dataset behind a 4GB InnoDB buffer pool, so every book/category page is
 * a genuinely multi-second render whenever its data isn't hot in cache.
 * SEO/AI-scrape crawlers (Semrush, Ahrefs, DataForSEO, Amazon, Bytespider,
 * Apple, GPTBot, ...) were driving ~40% of traffic straight into those
 * expensive pages and keeping MySQL pinned at 90%+ CPU - the "sistemde çok
 * büyük yavaşlık" report. These crawlers send this site zero referral
 * traffic, so they're disallowed outright. Google/Bing/DuckDuckGo/Yandex
 * (real search referrers) and the social link-preview fetchers keep full
 * access.
 *
 * Also: deep listing pagination and the search-results page are the most
 * expensive uncacheable requests and have no standalone SEO value (the
 * canonical content is reachable from page 1 / the sitemap), so even the
 * allowed crawlers are kept off `?page=` beyond shallow depth and off
 * `/ara`.
 */
const BLOCKED_CRAWLERS = [
  "AhrefsBot",
  "SemrushBot",
  "DotBot",
  "MJ12bot",
  "BLEXBot",
  "PetalBot",
  "DataForSeoBot",
  "SerpstatBot",
  "Barkrowler",
  "MegaIndex",
  "ZoominfoBot",
  "ImagesiftBot",
  "Amazonbot",
  "Amzn-SearchBot",
  "Applebot",
  "Applebot-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "CCBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Bytespider",
  "Bytedance",
  "Diffbot",
  "Omgili",
  "omgilibot",
  "Webzio",
  "Timpibot",
  "cohere-ai",
  "YouBot",
  "Kagibot",
  "iaskspider",
  "DuckAssistBot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FriendlyCrawler",
  "AwarioBot",
  "magpie-crawler",
  "peer39_crawler",
  "Scrapy",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...BLOCKED_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" as const })),
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/mesajlar",
          "/bildirimler",
          "/profil/duzenle",
          "/hesap/",
          "/ara",
          "/*?*page=",
          "/*?*_bust=",
        ],
      },
    ],
    sitemap: "https://dklist.com/sitemap.xml",
  };
}
