"use server";

import { auth } from "@/auth";
import { markAllNotificationsRead, deleteNotification, deleteAllNotifications } from "@/db/queries/notifications";

export async function markAllReadAction(): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await markAllNotificationsRead(Number(session.user.id));
  return { status: true };
}

export async function deleteNotificationAction(
  notificationId: number,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await deleteNotification(Number(session.user.id), notificationId);
  return { status: true };
}

export async function deleteAllNotificationsAction(): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await deleteAllNotifications(Number(session.user.id));
  return { status: true };
}
