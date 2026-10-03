import { apiFetch } from "@/api/client";

export interface NotificationItem {
  id: number;
  contentTr: string;
  view: boolean;
  senderUsername: string;
  senderImage: string | null;
  type: string;
  /** Site-relative page the notification is about, when known. */
  link: string | null;
  createdAt?: string | null;
}

export async function getNotifications() {
  return apiFetch<{ status: "ok"; notifications: NotificationItem[]; unreadCount: number }>("/notifications");
}

export async function markAllNotificationsRead() {
  return apiFetch<{ status: "ok" }>("/notifications/read-all", { method: "POST" });
}

export async function deleteNotification(id: number) {
  return apiFetch<{ status: "ok" }>(`/notifications?id=${id}`, { method: "DELETE" });
}

export async function deleteAllNotifications() {
  return apiFetch<{ status: "ok" }>("/notifications", { method: "DELETE" });
}

export async function markNotificationRead(id: number) {
  return apiFetch<{ status: "ok" }>(`/notifications?id=${id}`, { method: "PATCH" });
}
