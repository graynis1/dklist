import { apiFetch } from "@/api/client";

export interface BlockedUserItem {
  id: number;
  username: string;
  image: string | null;
  blockedAt: string;
}

export async function getBlockedUsers() {
  return apiFetch<{ status: "ok"; users: BlockedUserItem[] }>("/me/blocked-users");
}
