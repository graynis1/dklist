import { apiFetch } from "@/api/client";
import type { LibraryByStatus } from "@/api/library";

export interface OtherProfile {
  id: number;
  username: string;
  name: string | null;
  surname: string | null;
  biyo: string | null;
  image: string | null;
  verified: boolean;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  privacy: boolean;
}

export interface ReadingGoal {
  year: string;
  targetCount: number;
  readCount: number;
}

export interface ReadingStats {
  year: string;
  booksRead: number;
  totalPages: number;
  totalMinutes: number;
  topCategory: string | null;
  topWriter: string | null;
}

export interface ProfileBlog {
  id: number;
  title: string;
  slug: string;
  approved: boolean;
}

export interface OtherProfileResponse {
  profile: OtherProfile;
  counts: { followers: number; following: number };
  isSelf: boolean;
  following: boolean;
  blocked: boolean;
  canSeeLibrary: boolean;
  badges: { id: number; name: string; comment: string; img: string }[];
  library: LibraryByStatus | null;
  // Absent until the backend with these fields is deployed - treat as optional.
  readingGoal?: ReadingGoal | null;
  pastGoals?: ReadingGoal[];
  stats?: ReadingStats | null;
  monthly?: number[] | null;
  blogs?: ProfileBlog[];
}

export async function setReadingGoal(count: number) {
  return apiFetch<{ status: "ok"; goal: ReadingGoal | null }>("/me/reading-goal", { method: "POST", body: JSON.stringify({ count }) });
}

export async function getProfile(username: string) {
  return apiFetch<{ status: "ok" } & OtherProfileResponse>(`/profile/${encodeURIComponent(username)}`);
}

export async function toggleFollow(username: string) {
  return apiFetch<{ status: "ok"; following: boolean }>(`/profile/${encodeURIComponent(username)}/follow`, {
    method: "POST",
  });
}

export async function toggleBlock(username: string) {
  return apiFetch<{ status: "ok"; blocked: boolean }>(`/profile/${encodeURIComponent(username)}/block`, {
    method: "POST",
  });
}
