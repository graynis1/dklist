import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookClub, bookClubMember, bookClubJoinRequest, user, book, writerBook, writer } from "@/db/schema";
import { isDuplicateKeyError } from "@/lib/db-errors";
import { hasRole, USER_TYPES } from "@/lib/roles";
import { awardPoints, getPointSettings } from "@/db/queries/points";
import { addNotification } from "@/db/queries/notifications";

/**
 * Book clubs / group reading - maintainer's explicit ask, built from scratch
 * (no v1 equivalent). Discussion deliberately reuses the existing generic
 * comment system (`CommentTargetType` extended with "bookClub") rather than
 * a bespoke table - gets 2-level reply threading, AI moderation, hashtag
 * mentions, and point-earning for free, matching how ratings/likes were
 * already generalized across book/writer/translator this session.
 *
 * `visibility` only controls whether a club shows up in `/kulupler` - a
 * "private" club still works via a direct link, matching the lightweight
 * "unlisted, not access-controlled" pattern already used elsewhere in this
 * app rather than building a separate invite/approval system.
 *
 * Membership earns `clubJoin` points (see points.ts) - deliberately deferred
 * when clubs first shipped, wired in as the documented follow-up. Awarded to
 * the owner on creation (implicit self-join) and to anyone joining via
 * joinClub(), keyed per (user, club) so it can never double-award.
 */

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "kulup";
  let candidate = root;
  let n = 1;
  while (true) {
    const [existing] = await db.select({ id: bookClub.id }).from(bookClub).where(eq(bookClub.slug, candidate)).limit(1);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export interface CreateClubInput {
  name: string;
  description: string;
  visibility?: "public" | "private";
  currentBookId?: number | null;
}

export async function createBookClub(ownerId: number, input: CreateClubInput): Promise<{ id: number; slug: string }> {
  const name = input.name.trim();
  if (name.length < 3) throw new Error("Kulüp adı en az 3 karakter olmalıdır.");
  const description = input.description.trim();
  if (!description) throw new Error("Kulüp açıklaması zorunludur.");

  const slug = await uniqueSlug(name);
  const [result] = await db.insert(bookClub).values({
    name,
    slug,
    description,
    ownerId,
    currentBookId: input.currentBookId ?? null,
    visibility: input.visibility === "private" ? "private" : "public",
    createdDate: nowSql(),
  });

  await db.insert(bookClubMember).values({ clubId: result.insertId, userId: ownerId, role: "owner", joinedAt: nowSql() });
  await awardPoints(ownerId, (await getPointSettings()).clubJoin, "club_join", `club_join:${ownerId}:${result.insertId}`);

  return { id: result.insertId, slug };
}

export interface ClubListItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  currentBookName: string | null;
  currentBookSlug: string | null;
}

export async function getClubList(page = 1, pageSize = 20, search = ""): Promise<{ items: ClubListItem[]; total: number; page: number; lastPage: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("book-club-list");

  const safeSize = Math.min(50, Math.max(1, pageSize));
  const trimmed = search.trim();
  const whereClause = trimmed
    ? and(eq(bookClub.visibility, "public"), like(sql`LOWER(${bookClub.name})`, sql`LOWER(${`%${trimmed}%`})`))
    : eq(bookClub.visibility, "public");

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(bookClub).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);

  const rows = await db
    .select({
      id: bookClub.id,
      name: bookClub.name,
      slug: bookClub.slug,
      description: bookClub.description,
      currentBookName: book.name,
      currentBookSlug: book.slug,
      memberCount: sql<number>`(SELECT COUNT(*) FROM book_club_member WHERE club_id = ${bookClub.id})`,
    })
    .from(bookClub)
    .leftJoin(book, eq(bookClub.currentBookId, book.id))
    .where(whereClause)
    .orderBy(desc(bookClub.id))
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return {
    items: rows.map((r) => ({ ...r, memberCount: Number(r.memberCount) })),
    total,
    page: safePage,
    lastPage,
  };
}

export interface ClubMember {
  userId: number;
  username: string;
  role: string;
  joinedAt: string;
}

export interface ClubDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  visibility: string;
  ownerId: number | null;
  ownerUsername: string | null;
  currentBookId: number | null;
  currentBookName: string | null;
  currentBookSlug: string | null;
  currentBookHasImage: boolean;
  currentBookWriters: string[];
  memberCount: number;
  members: ClubMember[];
  requiresApproval: boolean;
}

export async function getClubBySlug(slug: string): Promise<ClubDetail | null> {
  const [row] = await db
    .select({
      id: bookClub.id,
      name: bookClub.name,
      slug: bookClub.slug,
      description: bookClub.description,
      visibility: bookClub.visibility,
      ownerId: bookClub.ownerId,
      ownerUsername: user.username,
      currentBookId: bookClub.currentBookId,
      currentBookName: book.name,
      currentBookSlug: book.slug,
      // Real gap found via customer report: the club's current-book
      // widget showed only name/author text, no cover - "daha görsel bir
      // hava katmazmıydı?" (wouldn't it add a more visual feel?).
      currentBookHasImage: sql<number>`(${book.image} is not null and ${book.image} != '')`,
      requiresApproval: bookClub.requiresApproval,
    })
    .from(bookClub)
    .leftJoin(user, eq(bookClub.ownerId, user.id))
    .leftJoin(book, eq(bookClub.currentBookId, book.id))
    .where(eq(bookClub.slug, slug))
    .limit(1);

  if (!row) return null;
  const club = { ...row, currentBookHasImage: Boolean(row.currentBookHasImage), requiresApproval: Boolean(row.requiresApproval) };

  const memberRows = await db
    .select({ userId: bookClubMember.userId, username: user.username, role: bookClubMember.role, joinedAt: bookClubMember.joinedAt })
    .from(bookClubMember)
    .innerJoin(user, eq(bookClubMember.userId, user.id))
    .where(eq(bookClubMember.clubId, club.id))
    .orderBy(bookClubMember.joinedAt);

  let currentBookWriters: string[] = [];
  if (club.currentBookId) {
    const writerRows = await db
      .select({ name: writer.name })
      .from(writerBook)
      .innerJoin(writer, eq(writerBook.writerId, writer.id))
      .where(eq(writerBook.bookId, club.currentBookId));
    currentBookWriters = writerRows.map((w) => w.name);
  }

  return { ...club, memberCount: memberRows.length, members: memberRows, currentBookWriters };
}

export async function isClubMember(clubId: number, userId: number): Promise<boolean> {
  const [row] = await db.select({ id: bookClubMember.id }).from(bookClubMember).where(and(eq(bookClubMember.clubId, clubId), eq(bookClubMember.userId, userId))).limit(1);
  return !!row;
}

/**
 * Customer's revisited ask: private clubs previously only had the
 * "unlisted, not access-controlled" model - a real approval gate now exists
 * per-club (see `requiresApproval`), opt-in so nothing changes for clubs
 * that never turn it on. Returns "pending" rather than joining outright
 * when the gate is on, so the caller/UI can show the right state.
 */
export async function joinClub(clubId: number, userId: number): Promise<{ pending: boolean }> {
  const [club] = await db.select({ id: bookClub.id, ownerId: bookClub.ownerId, name: bookClub.name, requiresApproval: bookClub.requiresApproval }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  if (!club) throw new Error("Kulüp bulunamadı.");

  if (club.requiresApproval) {
    const already = await isClubMember(clubId, userId);
    if (already) return { pending: false };
    try {
      await db.insert(bookClubJoinRequest).values({ clubId, userId, requestedAt: nowSql() });
    } catch (err) {
      if (isDuplicateKeyError(err, "uniq_book_club_join_request")) return { pending: true }; // already requested
      throw err;
    }
    if (club.ownerId) {
      const [requester] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
      if (requester) {
        await addNotification(
          club.ownerId,
          userId,
          `"${requester.username}" "${club.name}" kulübüne katılmak istiyor.`,
          `"${requester.username}" wants to join "${club.name}".`,
          "club",
        );
      }
    }
    return { pending: true };
  }

  try {
    await db.insert(bookClubMember).values({ clubId, userId, role: "member", joinedAt: nowSql() });
  } catch (err) {
    if (isDuplicateKeyError(err, "uniq_book_club_member")) return { pending: false }; // already a member, not an error
    throw err;
  }
  await awardPoints(userId, (await getPointSettings()).clubJoin, "club_join", `club_join:${userId}:${clubId}`);
  updateTag("book-club-list");
  return { pending: false };
}

export async function hasPendingClubJoinRequest(clubId: number, userId: number): Promise<boolean> {
  const [row] = await db.select({ id: bookClubJoinRequest.id }).from(bookClubJoinRequest).where(and(eq(bookClubJoinRequest.clubId, clubId), eq(bookClubJoinRequest.userId, userId))).limit(1);
  return !!row;
}

export interface ClubJoinRequestItem {
  userId: number;
  username: string;
  requestedAt: string;
}

export async function getClubJoinRequests(clubId: number, actorUserId: number, actorUserType: string): Promise<ClubJoinRequestItem[]> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  return db
    .select({ userId: bookClubJoinRequest.userId, username: user.username, requestedAt: bookClubJoinRequest.requestedAt })
    .from(bookClubJoinRequest)
    .innerJoin(user, eq(bookClubJoinRequest.userId, user.id))
    .where(eq(bookClubJoinRequest.clubId, clubId))
    .orderBy(bookClubJoinRequest.requestedAt);
}

export async function approveClubJoinRequest(clubId: number, targetUserId: number, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  const [req] = await db.select({ id: bookClubJoinRequest.id }).from(bookClubJoinRequest).where(and(eq(bookClubJoinRequest.clubId, clubId), eq(bookClubJoinRequest.userId, targetUserId))).limit(1);
  if (!req) throw new Error("İstek bulunamadı.");

  await db.delete(bookClubJoinRequest).where(eq(bookClubJoinRequest.id, req.id));
  try {
    await db.insert(bookClubMember).values({ clubId, userId: targetUserId, role: "member", joinedAt: nowSql() });
  } catch (err) {
    if (!isDuplicateKeyError(err, "uniq_book_club_member")) throw err;
  }
  await awardPoints(targetUserId, (await getPointSettings()).clubJoin, "club_join", `club_join:${targetUserId}:${clubId}`);

  const [club] = await db.select({ name: bookClub.name }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  if (club) {
    await addNotification(targetUserId, actorUserId, `"${club.name}" kulübüne katılma isteğin onaylandı.`, `Your request to join "${club.name}" was approved.`, "club");
  }
  updateTag("book-club-list");
}

export async function rejectClubJoinRequest(clubId: number, targetUserId: number, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  await db.delete(bookClubJoinRequest).where(and(eq(bookClubJoinRequest.clubId, clubId), eq(bookClubJoinRequest.userId, targetUserId)));

  const [club] = await db.select({ name: bookClub.name }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  if (club) {
    await addNotification(targetUserId, actorUserId, `"${club.name}" kulübüne katılma isteğin reddedildi.`, `Your request to join "${club.name}" was declined.`, "club");
  }
}

export async function setClubRequiresApproval(clubId: number, requiresApproval: boolean, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  await db.update(bookClub).set({ requiresApproval: requiresApproval ? 1 : 0 }).where(eq(bookClub.id, clubId));
}

/**
 * Real customer question: "istenmeyen ve uygun olmayan kişiyi gruptan atıp
 * yada almamak için kullanım açısından" (owner needs a way to remove an
 * unwanted member) - the club had a join/leave path but nothing let the
 * owner (or Admin/Mod) remove someone else. Owner can't remove themself
 * this way (leaveClub already blocks that, matching "transfer or delete
 * instead") or another owner-role row, since only one owner exists per club.
 */
export async function removeClubMember(clubId: number, targetUserId: number, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  const [membership] = await db.select({ role: bookClubMember.role }).from(bookClubMember).where(and(eq(bookClubMember.clubId, clubId), eq(bookClubMember.userId, targetUserId))).limit(1);
  if (!membership) return;
  if (membership.role === "owner") throw new Error("Kulüp sahibi çıkarılamaz.");
  await db.delete(bookClubMember).where(and(eq(bookClubMember.clubId, clubId), eq(bookClubMember.userId, targetUserId)));
  updateTag("book-club-list");
}

export async function leaveClub(clubId: number, userId: number): Promise<void> {
  const [membership] = await db.select({ role: bookClubMember.role }).from(bookClubMember).where(and(eq(bookClubMember.clubId, clubId), eq(bookClubMember.userId, userId))).limit(1);
  if (!membership) return;
  if (membership.role === "owner") {
    throw new Error("Kulüp sahibi kulüpten ayrılamaz. Önce sahipliği devretmeli veya kulübü silmelisiniz.");
  }
  await db.delete(bookClubMember).where(and(eq(bookClubMember.clubId, clubId), eq(bookClubMember.userId, userId)));
  updateTag("book-club-list");
}

async function requireClubManagePermission(clubId: number, actorUserId: number, actorUserType: string): Promise<void> {
  if (hasRole(actorUserType, [USER_TYPES.Admin, USER_TYPES.Mod])) return;
  const [club] = await db.select({ ownerId: bookClub.ownerId }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  if (!club) throw new Error("Kulüp bulunamadı.");
  if (club.ownerId !== actorUserId) throw new Error("Bu işlem için yetkiniz yok.");
}

/**
 * Customer's ask: club members should get notified of new club activity -
 * picking the next book is the one real "event" a club has (there's no
 * separate club-announcement/post feature). Every member except whoever
 * made the change gets notified, gated by the "club" notification-type
 * preference (see notifications.ts) so members who'd rather not get pinged
 * for every pick can opt out.
 */
export async function updateClubCurrentBook(clubId: number, bookId: number | null, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  await db.update(bookClub).set({ currentBookId: bookId }).where(eq(bookClub.id, clubId));

  if (bookId == null) return;
  const [club] = await db.select({ name: bookClub.name, slug: bookClub.slug }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  const [newBook] = await db.select({ name: book.name }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!club || !newBook) return;

  const members = await db
    .select({ userId: bookClubMember.userId })
    .from(bookClubMember)
    .where(and(eq(bookClubMember.clubId, clubId), sql`${bookClubMember.userId} != ${actorUserId}`));

  for (const m of members) {
    await addNotification(
      m.userId,
      actorUserId,
      `"${club.name}" kulübü yeni kitabını seçti: "${newBook.name}"`,
      `"${club.name}" picked a new book: "${newBook.name}"`,
      "club",
    );
  }
}

export async function updateClubDescription(clubId: number, description: string, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  const trimmed = description.trim();
  if (!trimmed) throw new Error("Açıklama boş olamaz.");
  await db.update(bookClub).set({ description: trimmed }).where(eq(bookClub.id, clubId));
}

/**
 * Real customer follow-up: "Kulüplerde var sadece açıklama düzenle
 * şeklinde olmuş... her ikisinde de başlık ve açıklama düzenle olmalı" -
 * only the description was editable, not the club's own name. Deliberately
 * does NOT touch `slug` (derived from the name only at creation) - renaming
 * keeps the existing URL/bookmarks working, matching how most real
 * platforms handle a display-name change (Discord server renames don't
 * break the server's invite link, X handle vs. display name, etc.) rather
 * than the bigger scope of regenerating the slug and adding a redirect.
 */
export async function updateClubName(clubId: number, name: string, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Kulüp adı boş olamaz.");
  await db.update(bookClub).set({ name: trimmed }).where(eq(bookClub.id, clubId));
  updateTag("book-club-list");
}

export async function deleteClub(clubId: number, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  await db.delete(bookClubMember).where(eq(bookClubMember.clubId, clubId));
  await db.delete(bookClub).where(eq(bookClub.id, clubId));
  updateTag("book-club-list");
}

export interface UserClubSummary {
  id: number;
  name: string;
  slug: string;
  role: string;
}

export async function getUserClubs(userId: number): Promise<UserClubSummary[]> {
  const rows = await db
    .select({ id: bookClub.id, name: bookClub.name, slug: bookClub.slug, role: bookClubMember.role })
    .from(bookClubMember)
    .innerJoin(bookClub, eq(bookClubMember.clubId, bookClub.id))
    .where(eq(bookClubMember.userId, userId))
    .orderBy(desc(bookClubMember.joinedAt));
  return rows;
}
