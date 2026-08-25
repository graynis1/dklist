import type { Metadata } from "next";

const SITE_NAME = "DKList";

/**
 * Shared page-metadata builder - the site had a real, large SEO gap
 * (only 2 of 84 page.tsx files had any metadata export at all, meaning
 * every page showed the same generic root title/description in search
 * results and link previews). Centralized here so every page gets a
 * correctly-shaped title/description/OG/Twitter/canonical block instead
 * of 80+ places hand-rolling the same object slightly differently.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      type: "website",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

/** Account/admin/transactional pages - no search-engine value, and some
 * could leak account-specific info if indexed. Applied at a shared
 * layout.tsx where possible (e.g. /admin/*) so it isn't repeated per
 * page; used directly where no shared layout exists. */
export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

/** Truncates a plain-text description to a search-result-friendly length
 * without cutting mid-word. */
export function truncateDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, "")}...`;
}
