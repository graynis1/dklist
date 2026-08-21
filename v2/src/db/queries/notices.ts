import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notice, comment, subComment, user } from "@/db/schema";
import { addNotification } from "./notifications";

// v1's NoticeController/Notice entity - a moderation "şikayet" (report) queue
// for admins/mods, entirely separate from NotifyManager/DKNotifiaction (the
// user-facing notification bell). `notice.type` is one of 'comment' |
// 'subComment' (a reported comment/reply) or 'user_report' (a reported
// profile) - getNotices()'s type filter below matches getAll()'s exact
// three-way split.

const ADMIN_TYPES = ["Admin", "SuperAdmin"];

export type NoticeCommentType = "comment" | "subComment";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function reportComment(
  reporterId: number,
  commentId: number,
  type: NoticeCommentType,
): Promise<{ status: boolean; message?: string }> {
  const [row] =
    type === "comment"
      ? await db.select({ userId: comment.userId }).from(comment).where(eq(comment.id, commentId)).limit(1)
      : await db.select({ userId: subComment.userId }).from(subComment).where(eq(subComment.id, commentId)).limit(1);

  if (!row) {
    return { status: false, message: "Yorum bulunamadı." };
  }

  const [owner] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, row.userId)).limit(1);

  // v1 silently refuses to let admin/superadmin comments be reported.
  if (owner && ADMIN_TYPES.includes(owner.userType)) {
    return { status: false, message: "Bu yorum şikayet edilemez." };
  }

  await db.insert(notice).values({
    commentId,
    type,
    reporterUserId: reporterId,
    createdAt: nowSql(),
    isResolved: 0,
  });

  return { status: true };
}

export async function reportUser(
  reporterId: number,
  reportedUserId: number,
  reason: string,
): Promise<{ status: boolean; message?: string }> {
  if (reporterId === reportedUserId) {
    return { status: false, message: "Kendinizi şikayet edemezsiniz." };
  }

  const [target] = await db
    .select({ userType: user.userType, username: user.username })
    .from(user)
    .where(eq(user.id, reportedUserId))
    .limit(1);

  if (!target) {
    return { status: false, message: "Kullanıcı bulunamadı." };
  }
  if (ADMIN_TYPES.includes(target.userType)) {
    return { status: false, message: "Admin kullanıcıları şikayet edilemez." };
  }

  // Same-type dedup within 24h, matching v1's reportUser() exactly.
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const [existing] = await db
    .select({ id: notice.id, createdAt: notice.createdAt })
    .from(notice)
    .where(
      and(
        eq(notice.reporterUserId, reporterId),
        eq(notice.reportedUserId, reportedUserId),
        eq(notice.type, "user_report"),
      ),
    )
    .orderBy(desc(notice.id))
    .limit(1);

  if (existing && new Date(existing.createdAt).getTime() > yesterday) {
    return { status: false, message: "Bu kullanıcıyı son 24 saat içinde zaten şikayet ettiniz." };
  }

  await db.insert(notice).values({
    type: "user_report",
    reporterUserId: reporterId,
    reportedUserId,
    reason,
    createdAt: nowSql(),
    isResolved: 0,
  });

  const [reporter] = await db.select({ username: user.username }).from(user).where(eq(user.id, reporterId)).limit(1);

  const mods = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`${user.userType} IN ('Mod', 'Admin', 'SuperAdmin')`);

  for (const mod of mods) {
    await addNotification(
      mod.id,
      reporterId,
      `Kullanıcı şikayeti: ${reporter?.username ?? "?"}, ${target.username} kullanıcısını şikayet etti. Sebep: ${reason}`,
      `User report: ${reporter?.username ?? "?"} reported ${target.username}. Reason: ${reason}`,
    );
  }

  return { status: true };
}

export interface NoticeListItem {
  id: number;
  type: string;
  createdAt: string;
  isResolved: boolean;
  reason: string | null;
  reportedUser: { id: number; username: string; disable: boolean; userType: string } | null;
  reporterUsername: string | null;
  commentText: string | null;
  commentOwnerUsername: string | null;
  commentOwnerId: number | null;
}

export type NoticeTypeFilter = "all" | "comment" | "user_report";

/** Admin/Mod-only listing - matches NoticeController::getAll()'s pagination
 * and per-type field shape (a user-report row surfaces the reported/reporter
 * users, a comment-report row surfaces the flagged comment + its owner). */
export async function getNotices(
  page: number,
  pageSize: number,
  typeFilter: NoticeTypeFilter,
): Promise<{ items: NoticeListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));

  const whereClause =
    typeFilter === "comment"
      ? sql`${notice.type} IN ('comment', 'subComment')`
      : typeFilter === "user_report"
        ? eq(notice.type, "user_report")
        : undefined;

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notice)
    .where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select()
    .from(notice)
    .where(whereClause)
    .orderBy(desc(notice.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  const items: NoticeListItem[] = [];
  for (const row of rows) {
    if (row.type === "user_report") {
      const reported = row.reportedUserId
        ? (
            await db
              .select({ id: user.id, username: user.username, disable: user.disable, userType: user.userType })
              .from(user)
              .where(eq(user.id, row.reportedUserId))
              .limit(1)
          )[0]
        : undefined;
      if (!reported) continue;

      const reporter = row.reporterUserId
        ? (await db.select({ username: user.username }).from(user).where(eq(user.id, row.reporterUserId)).limit(1))[0]
        : undefined;

      items.push({
        id: row.id,
        type: row.type,
        createdAt: row.createdAt,
        isResolved: Boolean(row.isResolved),
        reason: row.reason,
        reportedUser: { ...reported, disable: Boolean(reported.disable) },
        reporterUsername: reporter?.username ?? null,
        commentText: null,
        commentOwnerUsername: null,
        commentOwnerId: null,
      });
    } else {
      if (!row.commentId) continue;
      const commentId = Number(row.commentId);
      const commentRow =
        row.type === "comment"
          ? (await db.select({ text: comment.comment, userId: comment.userId }).from(comment).where(eq(comment.id, commentId)).limit(1))[0]
          : (await db.select({ text: subComment.comment, userId: subComment.userId }).from(subComment).where(eq(subComment.id, commentId)).limit(1))[0];
      if (!commentRow) continue;

      const owner = (
        await db.select({ id: user.id, username: user.username }).from(user).where(eq(user.id, commentRow.userId)).limit(1)
      )[0];
      if (!owner) continue;

      items.push({
        id: row.id,
        type: row.type,
        createdAt: row.createdAt,
        isResolved: Boolean(row.isResolved),
        reason: null,
        reportedUser: null,
        reporterUsername: null,
        commentText: commentRow.text,
        commentOwnerUsername: owner.username,
        commentOwnerId: owner.id,
      });
    }
  }

  return { items, total, page: effectivePage, lastPage };
}

export async function resolveNotice(id: number): Promise<void> {
  await db.update(notice).set({ isResolved: 1 }).where(eq(notice.id, id));
}

export async function deleteNotice(id: number): Promise<void> {
  await db.delete(notice).where(eq(notice.id, id));
}
