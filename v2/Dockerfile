FROM node:22-bookworm-slim AS build

WORKDIR /app

# `npm install`, not `npm ci` - this project's package-lock.json has been
# touched by npm on multiple platforms this session (Windows local, Linux
# cloud sandbox), leaving optional-dependency platform entries (esbuild's
# per-OS binaries, pulled in transitively at different versions by vitest
# vs. other tooling) in a shape `npm ci`'s strict lockfile-vs-package.json
# check rejects even right after a fresh `npm install` regenerates it.
# `npm install` is what this project's own dev workflow already uses
# everywhere else (there's no CI pipeline needing bit-for-bit lockfile
# reproducibility here), so it's the pragmatic, actually-working choice.
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Full production-only node_modules, NOT Next's `output: "standalone"` trace -
# see next.config.ts's comment on why: standalone tracing has known gaps with
# native addons (onnxruntime-node), and this project already hit that exact
# failure class once (a missing/broken native binary crashing the whole
# process) with `sharp` earlier this session. A real npm install of
# production deps is slower to build and a larger image, but it's the
# reliable option for a package with native bindings the local embedding
# model (Book DNA, AI moderation) genuinely depends on.
COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

# uploads/ (avatars, badges, blog images, and the cover-image cache) is a
# volume mount point, not baked into the image - see docker-compose.yml.
RUN mkdir -p uploads

EXPOSE 3000
CMD ["npm", "start"]
