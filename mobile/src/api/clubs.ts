import { apiFetch } from "@/api/client";

export interface ClubListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  currentBookName: string | null;
  currentBookSlug: string | null;
  image?: string | null;
  color?: string | null;
}

export interface ClubMember {
  userId: number;
  username: string;
  image: string | null;
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
  currentBookId: number | null;
  currentBookName: string | null;
  currentBookSlug: string | null;
  currentBookHasImage: boolean;
  currentBookWriters: string[];
  memberCount: number;
  members: ClubMember[];
  requiresApproval: boolean;
  image?: string | null;
  color?: string | null;
}

export interface ClubJoinRequest {
  userId: number;
  username: string;
  image: string | null;
  requestedAt: string;
}

export async function getClubList(q = "") {
  return apiFetch<{ status: "ok"; items: ClubListItem[]; total: number }>(`/clubs?q=${encodeURIComponent(q)}`);
}

export async function getClub(slug: string) {
  return apiFetch<{ status: "ok"; club: ClubDetail; isMember: boolean; isPending: boolean; canManage?: boolean; myRole?: string | null }>(`/clubs/${encodeURIComponent(slug)}`);
}

export async function createClub(input: { name: string; description: string; visibility: "public" | "private"; currentBookId?: number | null }) {
  return apiFetch<{ status: "ok"; id: number; slug: string }>("/clubs", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export async function updateClubName(slug: string, name: string) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/name`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateClubDescription(slug: string, description: string) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/description`, {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export async function updateClubCurrentBook(slug: string, bookId: number | null) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/current-book`, {
    method: "POST",
    body: JSON.stringify({ bookId }),
  });
}

export async function deleteClub(slug: string) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export interface ClubPostReply {
  id: number;
  text: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  replies: ClubPostReply[];
}

export interface ClubPost {
  id: number;
  text: string | null;
  image: string | null;
  createdAt: string;
  authorUserId: number;
  authorUsername: string;
  authorImage: string | null;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  likeState: { count: number; liked: boolean };
  replies: ClubPostReply[];
}

export async function getClubPosts(slug: string, before?: number) {
  return apiFetch<{ status: "ok"; items: ClubPost[]; nextCursor: number | null }>(`/clubs/${encodeURIComponent(slug)}/posts${before ? `?before=${before}` : ""}`);
}

export async function createClubPost(slug: string, text: string, image?: { uri: string; name: string; type: string } | null) {
  const formData = new FormData();
  formData.append("text", text);
  if (image) {
    // @ts-expect-error - RN FormData accepts a local asset descriptor.
    formData.append("image", { uri: image.uri, name: image.name, type: image.type });
  }
  return apiFetch<{ status: "ok"; id: number }>(`/clubs/${encodeURIComponent(slug)}/posts`, { method: "POST", body: formData });
}

export async function deleteClubPost(slug: string, postId: number) {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/posts/${postId}`, { method: "DELETE" });
}

export async function setClubMemberRole(slug: string, userId: number, role: "admin" | "member") {
  return apiFetch<{ status: "ok" }>(`/clubs/${encodeURIComponent(slug)}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export async function updateClubBranding(slug: string, input: { image?: { uri: string; name: string; type: string }; removeImage?: boolean; color?: string | null }) {
  const formData = new FormData();
  if (input.image) {
    // @ts-expect-error - RN FormData accepts a local asset descriptor.
    formData.append("image", { uri: input.image.uri, name: input.image.name, type: input.image.type });
  }
  if (input.removeImage) formData.append("removeImage", "1");
  if (input.color !== undefined) formData.append("color", input.color ?? "");
  return apiFetch<{ status: "ok"; image: string | null; color: string | null }>(`/clubs/${encodeURIComponent(slug)}/branding`, { method: "POST", body: formData });
}
