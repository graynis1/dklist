import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately NOT `output: "standalone"` - its file-tracing has known gaps
  // with native addons (onnxruntime-node, used by @huggingface/transformers
  // for the local embedding model), and this project already hit exactly
  // that failure class once today (sharp's native binary silently missing
  // at runtime crashed the whole server). The Dockerfile installs full
  // production node_modules instead, trading some image size for not
  // repeating that mistake in the one place it would matter most.
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
