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
