"use server";

import { auth } from "@/auth";
import {
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  setNotificationPreference,
  type NotificationType,
} from "@/db/queries/notifications";

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

export async function setNotificationPreferenceAction(
  type: NotificationType,
  enabled: boolean,
): Promise<{ status: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: false, message: "Giriş yapmalısınız." };
  }
  await setNotificationPreference(Number(session.user.id), type, enabled);
  return { status: true };
}
