import "server-only";
import { and, eq, inArray, like, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, publisher, writer, badges, userBadges } from "@/db/schema";
import { isProtectedFromRoleChange, USER_TYPES, type UserType } from "@/lib/permission";

export interface UserAdminListItem {
  id: number;
  username: string;
  mail: string;
  userType: string;
  disabled: boolean;
  publisherId: number | null;
  publisherName: string | null;
  writerId: number | null;
  writerName: string | null;
}

/**
 * Ports v1's real UserController::getUserForAdmin() - Kütüphaneci("Mod")/
 * Admin gated (v1's own permission list). Excludes SuperAdmin rows entirely
 * (matches v1's exact filter - there's genuinely no SuperAdmin account on
 * this data anyway, but the exclusion is still ported faithfully) - it's
 * the one account type this panel can never touch, by design.
 */
export async function getUserAdminList(page = 1, pageSize = 20, search = ""): Promise<{ items: UserAdminListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? and(ne(user.userType, USER_TYPES.SuperAdmin), like(sql`LOWER(${user.username})`, sql`LOWER(${`%${trimmedSearch}%`})`))
    : ne(user.userType, USER_TYPES.SuperAdmin);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(user).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({ id: user.id, username: user.username, mail: user.mail, userType: user.userType, disable: user.disable, publisherId: user.publisherId, publisherName: publisher.name, writerId: user.writerId, writerName: writer.name })
    .from(user)
    .leftJoin(publisher, eq(user.publisherId, publisher.id))
    .leftJoin(writer, eq(user.writerId, writer.id))
    .where(whereClause)
    .orderBy(user.id)
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return {
    items: rows.map((r) => ({ id: r.id, username: r.username, mail: r.mail, userType: r.userType, disabled: r.disable === 1, publisherId: r.publisherId, publisherName: r.publisherName, writerId: r.writerId, writerName: r.writerName })),
    total,
    page: safePage,
    lastPage,
  };
}

const ASSIGNABLE_ROLES: string[] = Object.values(USER_TYPES).filter((t) => t !== USER_TYPES.SuperAdmin);

/**
 * Ports v1's real UserController::userAdminUpdate() (Admin-only). Extended
 * with the isProtectedFromRoleChange() guard built earlier this session for
 * exactly this purpose - v1 has no such concept since Kurucu didn't exist
 * there, but this is precisely the endpoint that needed it once it did:
 * without this check here, an Admin could freely demote a Kurucu, making
 * the "un-revocable once granted" requirement meaningless.
 */
export async function updateUserRole(userId: number, newUserType: string): Promise<void> {
  const [target] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  if (target.userType === USER_TYPES.SuperAdmin) throw new Error("Bu kullanıcı üzerinde işlem yapılamaz.");
  if (isProtectedFromRoleChange(target.userType)) throw new Error("Kurucu rolü geri alınamaz.");
  if (!ASSIGNABLE_ROLES.includes(newUserType)) throw new Error("Tanımsız kullanıcı tipi.");
  await db.update(user).set({ userType: newUserType as UserType }).where(eq(user.id, userId));
}

export async function toggleUserDisabled(userId: number): Promise<void> {
  const [target] = await db.select({ userType: user.userType, disable: user.disable }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  if (target.userType === USER_TYPES.SuperAdmin) throw new Error("Bu kullanıcı üzerinde işlem yapılamaz.");
  await db.update(user).set({ disable: target.disable === 1 ? 0 : 1 }).where(eq(user.id, userId));
}

export async function updateUserPublisher(userId: number, publisherId: number | null): Promise<void> {
  const [target] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  if (publisherId !== null) {
    const [pub] = await db.select({ id: publisher.id }).from(publisher).where(eq(publisher.id, publisherId)).limit(1);
    if (!pub) throw new Error("Böyle bir yayınevi yok.");
  }
  await db.update(user).set({ publisherId }).where(eq(user.id, userId));
}

export async function updateUserBadges(userId: number, badgeIds: number[]): Promise<void> {
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  await db.delete(userBadges).where(eq(userBadges.userId, userId));
  if (badgeIds.length > 0) {
    const validBadges = await db.select({ id: badges.id }).from(badges).where(inArray(badges.id, badgeIds));
    const validIds = new Set(validBadges.map((b) => b.id));
    const rows = badgeIds.filter((id) => validIds.has(id)).map((badgeId) => ({ userId, badgesId: badgeId }));
    if (rows.length > 0) await db.insert(userBadges).values(rows);
  }
}
