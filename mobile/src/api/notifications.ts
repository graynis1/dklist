import { apiFetch } from "@/api/client";

export interface NotificationItem {
  id: number;
  contentTr: string;
  view: boolean;
  senderUsername: string;
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
