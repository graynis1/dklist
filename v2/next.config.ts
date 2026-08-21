import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16's current caching model - "use cache" + cacheLife/cacheTag - replaces the
  // older unstable_cache/route-segment `revalidate` pattern. Opting in from day one since
  // this is a greenfield app; see node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md.
  cacheComponents: true,
  // The official iyzipay SDK loads its resource classes via a runtime
  // fs.readdirSync + require() over its own lib/resources/ directory - not
  // statically analyzable, so Turbopack's server bundler can't resolve it
  // ("server relative imports are not implemented yet"). Opting it out of
  // bundling entirely (real Node require() at runtime, same as any other
  // node_modules package) fixes it - see next.config.ts docs for
  // serverExternalPackages.
  serverExternalPackages: ["iyzipay"],
};

export default nextConfig;
