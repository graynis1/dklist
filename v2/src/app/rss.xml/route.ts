import { connection } from "next/server";
import { getBlogList } from "@/db/queries/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dklist.com";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

/**
 * RSS 2.0 feed for /bloglar - a plain, no-AI-dependency way for readers to
 * follow new posts outside the site itself. Approved posts only, same
 * source (getBlogList) the public blog list page already uses.
 */
export async function GET() {
  // Even though getBlogList() itself is `'use cache'`, Next still tries to
  // populate that cache once during the build's static-prerender pass,
  // which needs a real DB connection at BUILD time - fine on a dev machine
  // where .env.local happens to be present, but wrong in a real deploy
  // (a Docker build has no DB access, and .env.local is gitignored/
  // dockerignored on purpose - production credentials don't belong baked
  // into a build layer). `connection()` defers this route to request time
  // instead, matching the same fix already applied to the homepage's
  // BookOfMonthWidget for the same underlying reason.
  await connection();
  const { items } = await getBlogList(1, 20, "");

  const itemsXml = items
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(post.preview)}</description>
      <pubDate>${toRfc822(post.createdDate)}</pubDate>
      ${post.ownerUsername ? `<author>${escapeXml(post.ownerUsername)}</author>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DKList Blog</title>
    <link>${SITE_URL}/bloglar</link>
    <description>DKList'teki en yeni blog yazıları</description>
    <language>tr</language>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
