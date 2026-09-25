/**
 * `EXPO_PUBLIC_`-prefixed env vars are inlined into the JS bundle at build
 * time by Expo (no extra config needed since SDK 49) - readable here via
 * `process.env` like any other. Defaults to the real production API
 * (`https://dklist.com`) - a build with no `.env.local` override (i.e.
 * the actual app anyone installs) talks to the real, live site, not a
 * placeholder. Local development overrides this via `.env.local`
 * (`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000` for an Android
 * emulator, or your machine's real LAN IP for a physical device, since
 * neither can resolve your computer's own `localhost`) - see
 * `.env.example`.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://dklist.com";

export const MOBILE_API_BASE = `${API_BASE_URL}/api/mobile/v1`;
