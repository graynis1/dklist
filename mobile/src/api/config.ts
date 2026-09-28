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

/**
 * Google Sign-In needs a real OAuth Client ID from Google Cloud Console
 * (Android + Web, matching the app's package name/SHA-1) - there is no
 * default here because one genuinely doesn't exist yet for this app.
 * Until these are set in `.env.local`, the login screen's Google button
 * stays visible but explains why it can't proceed instead of crashing.
 */
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
