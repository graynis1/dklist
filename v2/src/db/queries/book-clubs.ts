import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookClub, bookClubMember, user, book, writerBook, writer } from "@/db/schema";
import { isDuplicateKeyError } from "@/lib/db-errors";
import { hasRole, USER_TYPES } from "@/lib/roles";
import { awardPoints, getPointSettings } from "@/db/queries/points";
import { assertContentLength } from "@/lib/content-validation";

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
  assertContentLength(name, "Kulüp adı", { min: 3 });
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
  currentBookWriters: string[];
  memberCount: number;
  members: ClubMember[];
}

export async function getClubBySlug(slug: string): Promise<ClubDetail | null> {
  const [club] = await db
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
    })
    .from(bookClub)
    .leftJoin(user, eq(bookClub.ownerId, user.id))
    .leftJoin(book, eq(bookClub.currentBookId, book.id))
    .where(eq(bookClub.slug, slug))
    .limit(1);

  if (!club) return null;

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

export async function joinClub(clubId: number, userId: number): Promise<void> {
  const [club] = await db.select({ id: bookClub.id }).from(bookClub).where(eq(bookClub.id, clubId)).limit(1);
  if (!club) throw new Error("Kulüp bulunamadı.");
  try {
    await db.insert(bookClubMember).values({ clubId, userId, role: "member", joinedAt: nowSql() });
  } catch (err) {
    if (isDuplicateKeyError(err, "uniq_book_club_member")) return; // already a member, not an error
    throw err;
  }
  await awardPoints(userId, (await getPointSettings()).clubJoin, "club_join", `club_join:${userId}:${clubId}`);
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

export async function updateClubCurrentBook(clubId: number, bookId: number | null, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  await db.update(bookClub).set({ currentBookId: bookId }).where(eq(bookClub.id, clubId));
}

export async function updateClubDescription(clubId: number, description: string, actorUserId: number, actorUserType: string): Promise<void> {
  await requireClubManagePermission(clubId, actorUserId, actorUserType);
  const trimmed = description.trim();
  if (!trimmed) throw new Error("Açıklama boş olamaz.");
  await db.update(bookClub).set({ description: trimmed }).where(eq(bookClub.id, clubId));
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
