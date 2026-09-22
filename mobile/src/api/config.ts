/**
 * `EXPO_PUBLIC_`-prefixed env vars are inlined into the JS bundle at build
 * time by Expo (no extra config needed since SDK 49) - readable here via
 * `process.env` like any other. Falls back to a LAN-friendly localhost
 * guess for local dev: the Expo Go app on a physical phone can't reach
 * your computer's `localhost`, it needs your machine's real LAN IP - set
 * `EXPO_PUBLIC_API_BASE_URL` in `.env` to that IP (e.g.
 * `http://192.168.1.23:3000`) when testing on a real device instead of a
 * simulator, which resolves `localhost` back to the host machine itself.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export const MOBILE_API_BASE = `${API_BASE_URL}/api/mobile/v1`;
