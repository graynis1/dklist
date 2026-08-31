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
  //
  // `sharp` (added for saveUploadedImage()'s any-format-to-webp conversion)
  // needs the same treatment for a different reason: it's a native addon
  // (a .node binary alongside its own bundled libvips DLLs on Windows) -
  // letting Turbopack pull it into its own module graph broke its relative
  // DLL lookup entirely (`ERR_DLOPEN_FAILED`/Windows error 127) even though
  // a plain `require("sharp")` outside Next works fine. serverExternalPackages
  // keeps it a real runtime require() from its own node_modules location,
  // where its DLL search path is intact.
  serverExternalPackages: ["iyzipay", "sharp"],
};

export default nextConfig;
