import type { MetadataRoute } from "next";
import { getTopBooks, getTopCategories } from "@/db/queries/books";
import { getWriterList } from "@/db/queries/writers";
import { getTranslatorList } from "@/db/queries/translators";
import { getPublisherList } from "@/db/queries/publishers";
import { getBlogList } from "@/db/queries/blog";
import { getClubList } from "@/db/queries/book-clubs";
import { getPublicLists } from "@/db/queries/reading-lists";

const BASE = "https://dklist.com";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/kitaplar", priority: 0.9, changeFrequency: "daily" },
  { path: "/yazarlar", priority: 0.8, changeFrequency: "daily" },
  { path: "/cevirmenler", priority: 0.7, changeFrequency: "daily" },
  { path: "/yayinevleri", priority: 0.7, changeFrequency: "daily" },
  { path: "/ara", priority: 0.6, changeFrequency: "weekly" },
  { path: "/akis", priority: 0.6, changeFrequency: "hourly" },
  { path: "/bloglar", priority: 0.7, changeFrequency: "daily" },
  { path: "/askida-kitap", priority: 0.7, changeFrequency: "daily" },
  { path: "/kulupler", priority: 0.6, changeFrequency: "daily" },
  { path: "/listeler", priority: 0.6, changeFrequency: "daily" },
  { path: "/ayin-kitabi", priority: 0.6, changeFrequency: "weekly" },
  { path: "/rozetler", priority: 0.4, changeFrequency: "monthly" },
  { path: "/puan-tablosu", priority: 0.5, changeFrequency: "daily" },
  { path: "/puan-magazasi", priority: 0.4, changeFrequency: "weekly" },
  { path: "/premium", priority: 0.5, changeFrequency: "monthly" },
  { path: "/yazarhane", priority: 0.5, changeFrequency: "weekly" },
  { path: "/giris", priority: 0.3, changeFrequency: "yearly" },
  { path: "/kayit-ol", priority: 0.3, changeFrequency: "yearly" },
  { path: "/destek", priority: 0.3, changeFrequency: "monthly" },
  { path: "/reklam-ver", priority: 0.3, changeFrequency: "monthly" },
  { path: "/gizlilik-politikasi", priority: 0.2, changeFrequency: "yearly" },
  { path: "/cerez-politikasi", priority: 0.2, changeFrequency: "yearly" },
  { path: "/site-kullanim-sartlari", priority: 0.2, changeFrequency: "yearly" },
];

/**
 * The real catalog has ~98.5M books, ~11.3M writers, and ~4.6M publishers
 * on production - an actual per-row sitemap at that scale is neither
 * realistic to generate on every request nor useful to search engines
 * (Google's own guidance treats a sitemap as a discovery hint, not a
 * mandate to include everything; deep catalog pages are meant to be
 * reached via category pages, search, and internal links, the same way
 * a large e-commerce catalog handles this). This sitemap covers every
 * static route plus a bounded, real, highest-value sample of each dynamic
 * entity type (most-viewed books, full category taxonomy, top writers/
 * translators/publishers, and all first-class user-generated content -
 * blogs/clubs/public lists, which are small in number) rather than
 * silently omitting dynamic content altogether (the previous state -
 * there was no sitemap.ts at all).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [topBooks, categories, writers, translators, publishers, blogs, clubs, lists] = await Promise.all([
    getTopBooks(2000),
    getTopCategories(200),
    getWriterList(1, 100),
    getTranslatorList(1, 100),
    getPublisherList(1, 100),
    getBlogList(1, 100),
    getClubList(1, 50),
    getPublicLists(100),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const bookEntries: MetadataRoute.Sitemap = topBooks.map((b) => ({
    url: `${BASE}/kitap/${b.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${BASE}/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const writerEntries: MetadataRoute.Sitemap = writers.items.map((w) => ({
    url: `${BASE}/yazar/${w.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const translatorEntries: MetadataRoute.Sitemap = translators.items.map((t) => ({
    url: `${BASE}/cevirmen/${t.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const publisherEntries: MetadataRoute.Sitemap = publishers.items.map((p) => ({
    url: `${BASE}/yayinevi/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogs.items.map((b) => ({
    url: `${BASE}/blog/${b.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // getClubList() already filters to visibility="public" - see book-clubs.ts.
  const clubEntries: MetadataRoute.Sitemap = clubs.items.map((c) => ({
    url: `${BASE}/kulup/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  const listEntries: MetadataRoute.Sitemap = lists.map((l) => ({
    url: `${BASE}/liste/${l.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...categoryEntries,
    ...bookEntries,
    ...writerEntries,
    ...translatorEntries,
    ...publisherEntries,
    ...blogEntries,
    ...clubEntries,
    ...listEntries,
  ];
}
