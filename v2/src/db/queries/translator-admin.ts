import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { translator } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { saveUploadedImage } from "@/lib/image-upload";
import { deleteCommentTreeForTarget } from "@/db/queries/entity-delete-cascade";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "translator");

function deleteTranslatorImageFile(filename: string): Promise<void> {
  return unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
}

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface TranslatorListItem {
  id: number;
  name: string;
  biyo: string | null;
  birthDate: string | null;
  deathDate: string | null;
  img: string | null;
}

export async function getTranslatorAdminList(page = 1, pageSize = 20, search = ""): Promise<{ items: TranslatorListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${translator.name})`, sql`LOWER(${`%${trimmedSearch}%`})`)
    : undefined;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(translator).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const items = await db.select({
    id: translator.id, name: translator.name, biyo: translator.biyo,
    birthDate: translator.birthDate, deathDate: translator.deathDate, img: translator.img,
  }).from(translator).where(whereClause).orderBy(translator.id).limit(safeSize).offset((safePage - 1) * safeSize);
  return { items, total, page: safePage, lastPage };
}

export interface CreateTranslatorInput {
  name: string;
  biyo?: string;
  birthDate?: string;
  deathDate?: string;
  image?: File;
}

export async function createTranslator(input: CreateTranslatorInput): Promise<TranslatorListItem> {
  const name = input.name.trim();
  const biyo = input.biyo?.trim() || null;
  if (isDirty(name) || isDirty(biyo ?? "")) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  if (!name) throw new Error("Çevirmen ismi zorunludur.");
  const [existing] = await db.select({ id: translator.id }).from(translator).where(eq(translator.name, name)).limit(1);
  if (existing) throw new Error(`${name} isimli çevirmen zaten var.`);

  let img: string | null = null;
  if (input.image && input.image.size > 0) img = await saveUploadedImage("translator", input.image);

  const [result] = await db.insert(translator).values({
    name,
    biyo,
    birthDate: input.birthDate || null,
    deathDate: input.deathDate || null,
    img,
    slug: slugify(name),
    viewCount: "0",
    score: 0,
  });
  return { id: result.insertId, name, biyo, birthDate: input.birthDate || null, deathDate: input.deathDate || null, img };
}

export type TranslatorUpdateMode = "name" | "biyo" | "birthDate" | "deathDate" | "img";

export async function updateTranslatorField(translatorId: number, mode: TranslatorUpdateMode, value: string | File | null): Promise<void> {
  const [existing] = await db.select({ img: translator.img }).from(translator).where(eq(translator.id, translatorId)).limit(1);
  if (!existing) throw new Error("Çevirmen bulunamadı.");

  if (mode === "img") {
    if (existing.img) await deleteTranslatorImageFile(existing.img);
    if (value === null) {
      await db.update(translator).set({ img: null }).where(eq(translator.id, translatorId));
      return;
    }
    if (!(value instanceof File) || value.size === 0) throw new Error("Geçerli bir görsel yüklemelisiniz.");
    const filename = await saveUploadedImage("translator", value);
    await db.update(translator).set({ img: filename }).where(eq(translator.id, translatorId));
    return;
  }

  const text = value === null ? "" : String(value).trim();
  if (mode === "name" && !text) throw new Error("Çevirmen ismi boş bırakılamaz.");
  if (isDirty(text)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");

  switch (mode) {
    case "name":
      await db.update(translator).set({ name: text, slug: slugify(text) }).where(eq(translator.id, translatorId));
      break;
    case "biyo":
      await db.update(translator).set({ biyo: text || null }).where(eq(translator.id, translatorId));
      break;
    case "birthDate":
      await db.update(translator).set({ birthDate: text || null }).where(eq(translator.id, translatorId));
      break;
    case "deathDate":
      await db.update(translator).set({ deathDate: text || null }).where(eq(translator.id, translatorId));
      break;
  }
}

async function deleteTranslatorRow(translatorId: number): Promise<{ name: string; img: string | null } | null> {
  const [existing] = await db.select({ name: translator.name, img: translator.img }).from(translator).where(eq(translator.id, translatorId)).limit(1);
  if (!existing) return null;
  await deleteCommentTreeForTarget("translator", translatorId);
  await db.delete(translator).where(eq(translator.id, translatorId));
  if (existing.img) await deleteTranslatorImageFile(existing.img);
  return existing;
}

export async function deleteTranslator(translatorId: number): Promise<void> {
  const deleted = await deleteTranslatorRow(translatorId);
  if (!deleted) throw new Error("Çevirmen bulunamadı.");
}

export async function deleteTranslators(translatorIds: number[]): Promise<{ success: number; fail: number }> {
  let success = 0;
  for (const id of translatorIds) {
    if (await deleteTranslatorRow(id)) success++;
  }
  return { success, fail: translatorIds.length - success };
}
