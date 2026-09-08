import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Real customer-reported bug (2026-09-09), root-caused via direct logging:
 * Next.js's dynamic route params for `[username]`-style segments are NOT
 * consistently decoded - `generateMetadata` on the profile page correctly
 * received a decoded value ("Gülten Türkel "), while the page component
 * itself (same `await params` destructure, same route) received the raw,
 * still-percent-encoded string ("G%C3%BClten%20T%C3%BCrkel%20") for the
 * exact same request - confirmed by logging the real value and its code
 * points. `getProfileByUsername()` then does an exact match against the
 * DB, which naturally finds nothing for the still-encoded string. Safe to
 * apply unconditionally: an already-decoded value with no `%XX` sequences
 * passes through unchanged; a real, deliberate `%` in a username (rare,
 * but not impossible) falls back to the raw value on a malformed-sequence
 * decode error rather than throwing.
 */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** MySQL DATETIME strings (`YYYY-MM-DD HH:MM:SS`) aren't valid ISO 8601 -
 * `new Date()` parses them as local time in Node, which is what we want
 * here since `pointTransaction.createdAt` is written via the app server's
 * own local clock (see points.ts), not UTC. */
export function formatRelativeTime(mysqlDatetime: string): string {
  const then = new Date(mysqlDatetime.replace(" ", "T"));
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));

  if (seconds < 60) return "az önce";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}
