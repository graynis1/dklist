import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminActionLog, user } from "@/db/schema";

/**
 * Customer's Phase 4 spec: "All elevated-permission actions (mod/librarian
 * etc.) should be visible as an audit/activity log for oversight
 * (Facebook-group-admin-log style - action counts per person)." Fire-and-
 * forget from every requireRole()-gated mutation - never let a logging
 * failure block the real action, so callers don't await-and-throw on this.
 */
export async function logAdminAction(
  actorUserId: number,
  action: string,
  targetType?: string,
  targetId?: string | number,
  detail?: string,
): Promise<void> {
  try {
    await db.insert(adminActionLog).values({
      actorUserId,
      action,
      targetType: targetType ?? null,
      targetId: targetId === undefined ? null : String(targetId),
      detail: detail?.slice(0, 500) ?? null,
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  } catch {
    // Never let audit-logging failure block the real elevated action.
  }
}

export type AdminActionLogRow = {
  id: number;
  actorUserId: number;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
};

export async function getRecentAdminActions(limit = 100): Promise<AdminActionLogRow[]> {
  const rows = await db
    .select({
      id: adminActionLog.id,
      actorUserId: adminActionLog.actorUserId,
      actorName: user.username,
      action: adminActionLog.action,
      targetType: adminActionLog.targetType,
      targetId: adminActionLog.targetId,
      detail: adminActionLog.detail,
      createdAt: adminActionLog.createdAt,
    })
    .from(adminActionLog)
    .leftJoin(user, eq(user.id, adminActionLog.actorUserId))
    .orderBy(desc(adminActionLog.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, actorName: r.actorName ?? `#${r.actorUserId}` }));
}

export type AdminActionCount = { actorUserId: number; actorName: string; count: number };

export async function getAdminActionCountsByPerson(): Promise<AdminActionCount[]> {
  const rows = await db
    .select({
      actorUserId: adminActionLog.actorUserId,
      actorName: user.username,
      count: sql<number>`count(*)`,
    })
    .from(adminActionLog)
    .leftJoin(user, eq(user.id, adminActionLog.actorUserId))
    .groupBy(adminActionLog.actorUserId, user.username)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({ ...r, actorName: r.actorName ?? `#${r.actorUserId}`, count: Number(r.count) }));
}
