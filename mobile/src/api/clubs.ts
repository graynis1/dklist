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
  ownerId: number | null;
  ownerUsername: string | null;
  currentBookName: string | null;
  currentBookSlug: string | null;
  currentBookWriters: string[];
  memberCount: number;
  members: ClubMember[];
  requiresApproval: boolean;
}

export interface ClubJoinRequest {
  userId: number;
  username: string;
  requestedAt: string;
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

export async function getClubJoinRequests(slug: string) {
  return apiFetch<{ status: "ok"; items: ClubJoinRequest[] }>(`/clubs/${encodeURIComponent(slug)}/requests`);
}

export async function respondToClubJoinRequest(slug: string, userId: number, action: "approve" | "reject") {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/requests/${userId}?action=${action}`, { method: "POST" });
}

export async function setClubRequiresApproval(slug: string, requiresApproval: boolean) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/approval`, {
    method: "POST",
    body: JSON.stringify({ requiresApproval }),
  });
}

export async function removeClubMember(slug: string, userId: number) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/members/${userId}`, { method: "DELETE" });
}
