import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
