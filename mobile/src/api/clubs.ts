import { apiFetch } from "@/api/client";

export interface ClubListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  currentBookName: string | null;
  currentBookSlug: string | null;
}

export interface ClubMember {
  userId: number;
  username: string;
  role: string;
  joinedAt: string;
}

export interface ClubDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  visibility: string;
  ownerUsername: string | null;
  currentBookName: string | null;
  currentBookSlug: string | null;
  currentBookWriters: string[];
  memberCount: number;
  members: ClubMember[];
  requiresApproval: boolean;
}

export async function getClubList(q = "") {
  return apiFetch<{ status: "ok"; items: ClubListItem[]; total: number }>(`/clubs?q=${encodeURIComponent(q)}`);
}

export async function getClub(slug: string) {
  return apiFetch<{ status: "ok"; club: ClubDetail; isMember: boolean; isPending: boolean }>(`/clubs/${encodeURIComponent(slug)}`);
}

export async function joinClub(slug: string) {
  return apiFetch<{ status: "ok"; pending: boolean }>(`/clubs/${encodeURIComponent(slug)}/join`, { method: "POST" });
}

export async function leaveClub(slug: string) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/leave`, { method: "POST" });
}
