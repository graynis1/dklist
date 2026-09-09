import "server-only";
import { and, asc, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, publisher, writer, badges, userBadges } from "@/db/schema";
import { isProtectedFromRoleChange, USER_TYPES, type UserType } from "@/lib/permission";
import { isMailConfigured, sendMail } from "@/lib/mailer";

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
  /** Null, or a future timestamp - null once it's passed is NOT guaranteed
   * (nothing proactively clears it, see suspendUser()'s own doc comment),
   * so callers must always compare against "now", never just truthiness. */
  suspendedUntil: string | null;
  suspensionReason: string | null;
  sex: string;
  livingCity: string | null;
  birthDate: string;
  createdDate: string;
}

/**
 * Customer's ask ("demografik sort/filtre + toplu mail") - real, bounded
 * new scope, previously flagged as an open decision (see PLAN.md). City is
 * matched exactly (not fuzzy) since it's a free-text field with real
 * inconsistent casing/whitespace in this data - an admin picks from
 * getDistinctCities() below rather than typing it blind.
 */
export interface UserAdminFilters {
  sex?: string;
  livingCity?: string;
  userType?: string;
}

export type UserAdminSortBy = "id" | "createdDate" | "birthDate" | "username";

/**
 * Ports v1's real UserController::getUserForAdmin() - Kütüphaneci("Mod")/
 * Admin gated (v1's own permission list). Excludes SuperAdmin rows entirely
 * (matches v1's exact filter - there's genuinely no SuperAdmin account on
 * this data anyway, but the exclusion is still ported faithfully) - it's
 * the one account type this panel can never touch, by design.
 */
export async function getUserAdminList(
  page = 1,
  pageSize = 20,
  search = "",
  filters: UserAdminFilters = {},
  sortBy: UserAdminSortBy = "id",
  sortDir: "asc" | "desc" = "desc",
): Promise<{ items: UserAdminListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const whereClause = buildUserAdminWhere(search, filters);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(user).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);

  const sortColumn = { id: user.id, createdDate: user.createdDate, birthDate: user.birthDate, username: user.username }[sortBy];
  const orderFn = sortDir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: user.id,
      username: user.username,
      mail: user.mail,
      userType: user.userType,
      disable: user.disable,
      publisherId: user.publisherId,
      publisherName: publisher.name,
      writerId: user.writerId,
      writerName: writer.name,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
      sex: user.sex,
      livingCity: user.livingCity,
      birthDate: user.birthDate,
      createdDate: user.createdDate,
    })
    .from(user)
    .leftJoin(publisher, eq(user.publisherId, publisher.id))
    .leftJoin(writer, eq(user.writerId, writer.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return {
    items: rows.map((r) => ({
      id: r.id,
      username: r.username,
      mail: r.mail,
      userType: r.userType,
      disabled: r.disable === 1,
      publisherId: r.publisherId,
      publisherName: r.publisherName,
      writerId: r.writerId,
      writerName: r.writerName,
      suspendedUntil: r.suspendedUntil,
      suspensionReason: r.suspensionReason,
      sex: r.sex,
      livingCity: r.livingCity,
      birthDate: r.birthDate,
      createdDate: r.createdDate,
    })),
    total,
    page: safePage,
    lastPage,
  };
}

function buildUserAdminWhere(search: string, filters: UserAdminFilters) {
  const conditions = [ne(user.userType, USER_TYPES.SuperAdmin)];
  const trimmedSearch = search.trim();
  if (trimmedSearch) conditions.push(like(sql`LOWER(${user.username})`, sql`LOWER(${`%${trimmedSearch}%`})`));
  if (filters.sex) conditions.push(eq(user.sex, filters.sex));
  if (filters.livingCity) conditions.push(eq(user.livingCity, filters.livingCity));
  // Real ask (2026-09-10): as role assignments (Blog_Yazari, Yazar, etc.)
  // grow, finding "just the bloggers" in a plain paginated id-order list
  // gets impractical - a direct role filter, same shape as sex/city.
  if (filters.userType) conditions.push(eq(user.userType, filters.userType));
  return and(...conditions);
}

/** Feeds the city filter dropdown with real values only, not free typing
 * against a messy free-text column. */
export async function getDistinctUserCities(): Promise<string[]> {
  const rows = await db
    .select({ city: user.livingCity })
    .from(user)
    .where(and(ne(user.userType, USER_TYPES.SuperAdmin), sql`${user.livingCity} is not null and ${user.livingCity} != ''`))
    .groupBy(user.livingCity)
    .orderBy(asc(user.livingCity));
  return rows.map((r) => r.city).filter((c): c is string => c != null);
}

/**
 * Same reasoning as getDistinctUserCities() - real customer report
 * (2026-09-10): the sex filter's hardcoded options ("Erkek"/"Kadın") don't
 * even match the real column's values, so "Kadın" silently matched zero
 * rows, and "Erkek" + "Kadın" never summed to "hepsi" (all). Root cause
 * found via a direct prod query: this column carries a genuinely messy
 * mix of legacy v1 values ("Erkek", "Diğer" - capitalized, no dedicated
 * "prefer not to say" option existed back then) and new v2 registration
 * values ("kadin", "belirtmek-istemiyorum" - lowercase, undotted i,
 * matching kayit-ol/page.tsx's own SelectItem values exactly). Rather
 * than hardcode a guess at this mix (or normalize/rewrite historical
 * data, a separate and much riskier undertaking), feed the dropdown from
 * whatever values genuinely exist.
 */
export async function getDistinctUserSexValues(): Promise<string[]> {
  const rows = await db
    .select({ sex: user.sex })
    .from(user)
    .where(and(ne(user.userType, USER_TYPES.SuperAdmin), sql`${user.sex} is not null and ${user.sex} != ''`))
    .groupBy(user.sex)
    .orderBy(asc(user.sex));
  return rows.map((r) => r.sex).filter((s): s is string => s != null);
}

const BULK_MAIL_MAX_RECIPIENTS = 2000;

/**
 * Customer's ask: "toplu mail gönderme kriterlere göre" - sends to every
 * user matching the current search+filters (not just the visible page),
 * capped hard at BULK_MAIL_MAX_RECIPIENTS as a blunt safety net against a
 * fat-fingered "no filter at all" blast. Best-effort per recipient (one bad
 * address doesn't abort the whole batch) - real failures are counted and
 * returned, not silently swallowed.
 */
export async function sendBulkMailToFilteredUsers(
  search: string,
  filters: UserAdminFilters,
  subject: string,
  bodyHtml: string,
): Promise<{ sent: number; failed: number; total: number; capped: boolean }> {
  if (!isMailConfigured()) throw new Error("E-posta gönderimi yapılandırılmamış.");
  const trimmedSubject = subject.trim();
  if (!trimmedSubject) throw new Error("Konu boş olamaz.");
  if (!bodyHtml.trim()) throw new Error("Mesaj içeriği boş olamaz.");

  const whereClause = buildUserAdminWhere(search, filters);
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(user).where(whereClause);
  const total = Number(countRow?.count ?? 0);

  const rows = await db
    .select({ mail: user.mail })
    .from(user)
    .where(whereClause)
    .limit(BULK_MAIL_MAX_RECIPIENTS);

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await sendMail(r.mail, trimmedSubject, bodyHtml);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error("[bulk-mail] failed to send to", r.mail, err);
    }
  }

  return { sent, failed, total, capped: total > BULK_MAIL_MAX_RECIPIENTS };
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

/**
 * Süreli uzaklaştırma (temporary suspension) - customer's explicit ask,
 * distinct from toggleUserDisabled() above (that one is indefinite/manual,
 * this one carries its own expiry). Nothing needs to proactively "lift" it
 * once `until` passes - auth.ts's login gate always compares against the
 * current time, never just checks truthiness, so an expired suspension is
 * already effectively inert; this just also clears the columns so the
 * admin panel stops *showing* a stale suspended state after that.
 */
export async function suspendUser(userId: number, until: Date, reason: string | null): Promise<void> {
  const [target] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("Kullanıcı bulunamadı.");
  if (target.userType === USER_TYPES.SuperAdmin) throw new Error("Bu kullanıcı üzerinde işlem yapılamaz.");
  if (until.getTime() <= Date.now()) throw new Error("Bitiş tarihi gelecekte olmalı.");
  await db
    .update(user)
    .set({ suspendedUntil: until.toISOString().slice(0, 19).replace("T", " "), suspensionReason: reason })
    .where(eq(user.id, userId));
}

export async function liftSuspension(userId: number): Promise<void> {
  await db.update(user).set({ suspendedUntil: null, suspensionReason: null }).where(eq(user.id, userId));
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

/** Fetched lazily (only when the admin actually opens the badge/frame panel
 * for one row) rather than batched into getUserAdminList() - avoids an
 * extra join/query on every single page load of a list that's mostly just
 * being browsed, not edited. */
export async function getUserBadgeIds(userId: number): Promise<number[]> {
  const rows = await db.select({ badgesId: userBadges.badgesId }).from(userBadges).where(eq(userBadges.userId, userId));
  return rows.map((r) => r.badgesId);
}

/**
 * Real gap found via the maintainer's explicit "rozet çerçeve her şeyin
 * yönetimi olsun" ask: updateUserBadges() (below) already existed in this
 * file but had zero action/UI wired to it anywhere - a real v1-parity
 * comment on badge-admin.ts even documented this as "genuinely admin-
 * defined-but-manually-assigned-outside-the-app", matching v1's own
 * behavior rather than filling the gap. Wired up for real now, alongside a
 * new admin-only frame override (setUserFrameAdmin in point-store.ts) that
 * bypasses the normal points-cost/ownership check a self-service redemption
 * requires - an admin assigning a reward directly is a different action
 * from a user earning one, matching the same "admin can override anything"
 * spirit as the existing manual verified-badge toggle.
 */
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
