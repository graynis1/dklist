import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { badges, userBadges } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { saveUploadedImage } from "@/lib/image-upload";
import { containsPattern } from "@/lib/sql-like";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "badge");

function deleteBadgeImageFile(filename: string): Promise<void> {
  return unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}

/**
 * Ports v1's real BadgeController - a full admin CRUD for "Rozetler" (badge
 * TYPE definitions: name/description/image, bilingual). Genuinely distinct
 * from points.ts's auto-award system (findOrCreateMilestoneBadge/
 * checkMilestoneBadges), which only ever creates its own fixed set of
 * point-milestone badges - v1's real BadgeController lets an Admin define
 * ANY badge (arbitrary name/image/description) for manual or future use,
 * confirmed via source to have no user-assignment write path anywhere in
 * v1's own code (user_badges is real schema with no real writer in v1 -
 * genuinely admin-defined-but-manually-assigned-outside-the-app, matching
 * the "static/manually assigned" badge system the customer's notes
 * explicitly contrasted with the new activity-driven Emekter tier).
 */
export interface BadgeListItem {
  id: number;
  name: string;
  nameUs: string | null;
  comment: string;
  commentUs: string | null;
  img: string;
}

export async function getBadgeList(
  page = 1,
  pageSize = 20,
  search = "",
): Promise<{ items: BadgeListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${badges.name})`, sql`LOWER(${containsPattern(trimmedSearch)})`)
    : undefined;

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(badges).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);

  const items = await db
    .select({
      id: badges.id,
      name: badges.name,
      nameUs: badges.nameUs,
      comment: badges.comment,
      commentUs: badges.commentUs,
      img: badges.img,
    })
    .from(badges)
    .where(whereClause)
    .orderBy(badges.id)
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return { items, total, page: safePage, lastPage };
}

export interface CreateBadgeInput {
  name: string;
  comment: string;
  nameUs?: string;
  commentUs?: string;
  image: File;
}

export async function createBadge(input: CreateBadgeInput): Promise<BadgeListItem> {
  const name = input.name.trim();
  const comment = input.comment.trim();
  if (isDirty(name) || isDirty(comment)) {
    throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  }
  if (!name || !comment) {
    throw new Error("Rozet ismi ve açıklaması zorunludur.");
  }
  if (input.image.size === 0) {
    throw new Error("Rozet için bir görsel yüklemelisiniz.");
  }

  const filename = await saveUploadedImage("badge", input.image);
  const [result] = await db.insert(badges).values({
    name,
    comment,
    nameUs: input.nameUs?.trim() || null,
    commentUs: input.commentUs?.trim() || null,
    img: filename,
  });

  return { id: result.insertId, name, comment, nameUs: input.nameUs ?? null, commentUs: input.commentUs ?? null, img: filename };
}

export type BadgeUpdateMode = "name" | "comment" | "nameUs" | "commentUs" | "img";

export async function updateBadgeField(
  badgeId: number,
  mode: BadgeUpdateMode,
  value: string | File,
): Promise<void> {
  const [existing] = await db.select({ img: badges.img }).from(badges).where(eq(badges.id, badgeId)).limit(1);
  if (!existing) {
    throw new Error("Rozet bulunamadı.");
  }

  if (mode === "img") {
    if (!(value instanceof File) || value.size === 0) {
      throw new Error("Geçerli bir görsel yüklemelisiniz.");
    }
    const filename = await saveUploadedImage("badge", value);
    await db.update(badges).set({ img: filename }).where(eq(badges.id, badgeId));
    await deleteBadgeImageFile(existing.img);
    return;
  }

  const text = String(value).trim();
  if ((mode === "name" || mode === "comment") && !text) {
    throw new Error("Bu alan boş bırakılamaz.");
  }
  if (isDirty(text)) {
    throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  }

  switch (mode) {
    case "name":
      await db.update(badges).set({ name: text }).where(eq(badges.id, badgeId));
      break;
    case "comment":
      await db.update(badges).set({ comment: text }).where(eq(badges.id, badgeId));
      break;
    case "nameUs":
      await db.update(badges).set({ nameUs: text || null }).where(eq(badges.id, badgeId));
      break;
    case "commentUs":
      await db.update(badges).set({ commentUs: text || null }).where(eq(badges.id, badgeId));
      break;
  }
}

export async function deleteBadge(badgeId: number): Promise<void> {
  const [existing] = await db.select({ img: badges.img }).from(badges).where(eq(badges.id, badgeId)).limit(1);
  if (!existing) {
    throw new Error("Rozet bulunamadı.");
  }
  await db.delete(userBadges).where(eq(userBadges.badgesId, badgeId));
  await db.delete(badges).where(eq(badges.id, badgeId));
  await deleteBadgeImageFile(existing.img);
}

export async function deleteBadges(badgeIds: number[]): Promise<{ success: number; fail: number }> {
  if (badgeIds.length === 0) return { success: 0, fail: 0 };
  const rows = await db.select({ id: badges.id, img: badges.img }).from(badges).where(inArray(badges.id, badgeIds));
  await db.delete(userBadges).where(inArray(userBadges.badgesId, badgeIds));
  await db.delete(badges).where(inArray(badges.id, badgeIds));
  for (const row of rows) {
    await deleteBadgeImageFile(row.img);
  }
  return { success: rows.length, fail: badgeIds.length - rows.length };
}
