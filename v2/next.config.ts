import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16's current caching model - "use cache" + cacheLife/cacheTag - replaces the
  // older unstable_cache/route-segment `revalidate` pattern. Opting in from day one since
  // this is a greenfield app; see node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md.
  cacheComponents: true,
};

export default nextConfig;
