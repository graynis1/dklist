import { apiFetch } from "@/api/client";

export interface PublicBadgeItem {
  id: number;
  name: string;
  comment: string;
  img: string | null;
  earnedByCount: number;
  milestoneThreshold: number | null;
}

export async function getBadgeGallery() {
  return apiFetch<{ status: "ok"; badges: PublicBadgeItem[] }>("/badges");
}

/** `badge.img` holds two different real shapes, same issue as blog.image
 * on the web (see blogImageUrl's own doc comment there): a bare local
 * filename served via /api/badge-image/<name>, or - for some badges,
 * confirmed live ("Efsane Okur") - a full external Cloudinary URL. Pass
 * a full URL straight through instead of double-wrapping it into a
 * broken one. */
export function badgeImageUrl(img: string | null, apiBaseUrl: string): string | null {
  if (!img) return null;
  if (/^https?:\/\//i.test(img)) return img;
  return `${apiBaseUrl}/api/badge-image/${img}`;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  image: string | null;
  points: number;
}

export interface UserWeeklyRank {
  points: number;
  rank: number;
  totalRanked: number;
}

export async function getLeaderboard() {
  return apiFetch<{ status: "ok"; leaderboard: LeaderboardEntry[]; myRank: UserWeeklyRank | null }>("/leaderboard");
}
