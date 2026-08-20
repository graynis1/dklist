import "server-only";
import { updateTag } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dknotifiaction, user } from "@/db/schema";

/**
 * v1's NotifyManager::addNotification() (the actual user-facing notification
 * system - NOT `NoticeController`/`Notice`, which is a separate moderation
 * "şikayet" (report) queue for admins/mods, a different feature entirely).
 * Dedupes on (ownerUserId, senderUserId, message) exactly like v1 - a user
 * who likes/unlikes/re-likes the same thing repeatedly shouldn't spam
 * multiple identical notifications. Also blocks self-notification.
 */
export async function addNotification(
  ownerUserId: number,
  senderUserId: number,
  messageTr: string,
  messageUs: string,
): Promise<void> {
  if (ownerUserId === senderUserId) return;

  const [existing] = await db
    .select({ id: dknotifiaction.id })
    .from(dknotifiaction)
    .where(
      and(
        eq(dknotifiaction.ownerUserId, ownerUserId),
        eq(dknotifiaction.senderUserId, senderUserId),
        eq(dknotifiaction.commentTr, messageTr),
      ),
    )
    .limit(1);

  if (existing) return;

  await db.insert(dknotifiaction).values({
    ownerUserId,
    senderUserId,
    commentTr: messageTr,
    commentUs: messageUs,
    view: 0,
  });

  updateTag(`notifications:${ownerUserId}`);
  updateTag(`unread-notifications:${ownerUserId}`);
}

export interface NotificationItem {
  id: number;
  contentTr: string;
  view: boolean;
  senderUsername: string;
}

/** Deliberately uncached - the notification bell needs to reflect a just-sent
 * notification (e.g. after a follow) without a stale window, and this is a
 * cheap indexed lookup for a single user, not an aggregate. */
export async function getNotifications(userId: number, limit = 30): Promise<NotificationItem[]> {
  const rows = await db
    .select({
      id: dknotifiaction.id,
      contentTr: dknotifiaction.commentTr,
      view: dknotifiaction.view,
      senderUsername: user.username,
    })
    .from(dknotifiaction)
    .innerJoin(user, eq(dknotifiaction.senderUserId, user.id))
    .where(eq(dknotifiaction.ownerUserId, userId))
    .orderBy(desc(dknotifiaction.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, view: Boolean(r.view) }));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const rows = await db
    .select({ id: dknotifiaction.id })
    .from(dknotifiaction)
    .where(and(eq(dknotifiaction.ownerUserId, userId), eq(dknotifiaction.view, 0)));
  return rows.length;
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await db
    .update(dknotifiaction)
    .set({ view: 1 })
    .where(and(eq(dknotifiaction.ownerUserId, userId), eq(dknotifiaction.view, 0)));
  updateTag(`unread-notifications:${userId}`);
}

export async function deleteNotification(userId: number, notificationId: number): Promise<void> {
  await db
    .delete(dknotifiaction)
    .where(and(eq(dknotifiaction.id, notificationId), eq(dknotifiaction.ownerUserId, userId)));
  updateTag(`unread-notifications:${userId}`);
}
