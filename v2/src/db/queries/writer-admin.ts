import "server-only";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { writer } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { saveUploadedImage } from "@/lib/image-upload";
import { deleteCommentTreeForTarget } from "@/db/queries/entity-delete-cascade";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "writer");

function deleteWriterImageFile(filename: string): Promise<void> {
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

export interface WriterListItem {
  id: number;
  name: string;
  biyo: string | null;
  date: string | null;
  img: string | null;
}

export async function getWriterAdminList(page = 1, pageSize = 20, search = ""): Promise<{ items: WriterListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${writer.name})`, sql`LOWER(${`%${trimmedSearch}%`})`)
    : undefined;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(writer).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const items = await db.select({ id: writer.id, name: writer.name, biyo: writer.biyo, date: writer.date, img: writer.img })
    .from(writer).where(whereClause).orderBy(writer.id).limit(safeSize).offset((safePage - 1) * safeSize);
  return { items, total, page: safePage, lastPage };
}

export interface CreateWriterInput {
  name: string;
  biyo?: string;
  date?: string;
  image?: File;
}

export async function createWriter(input: CreateWriterInput): Promise<WriterListItem> {
  const name = input.name.trim();
  const biyo = input.biyo?.trim() || null;
  if (isDirty(name) || isDirty(biyo ?? "")) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  if (!name) throw new Error("Yazar ismi zorunludur.");
  const [existing] = await db.select({ id: writer.id }).from(writer).where(eq(writer.name, name)).limit(1);
  if (existing) throw new Error(`${name} isimli yazar zaten var.`);

  let img: string | null = null;
  if (input.image && input.image.size > 0) img = await saveUploadedImage("writer", input.image);

  const [result] = await db.insert(writer).values({
    name,
    biyo,
    date: input.date || null,
    img,
    slug: slugify(name),
    viewCount: "0",
    score: 0,
  });
  return { id: result.insertId, name, biyo, date: input.date || null, img };
}

export type WriterUpdateMode = "name" | "biyo" | "date" | "img" | "removeImage";

export async function updateWriterField(writerId: number, mode: WriterUpdateMode, value: string | File | null): Promise<void> {
  const [existing] = await db.select({ img: writer.img }).from(writer).where(eq(writer.id, writerId)).limit(1);
  if (!existing) throw new Error("Yazar bulunamadı.");

  if (mode === "img") {
    if (existing.img) await deleteWriterImageFile(existing.img);
    if (!(value instanceof File) || value.size === 0) throw new Error("Geçerli bir görsel yüklemelisiniz.");
    const filename = await saveUploadedImage("writer", value);
    await db.update(writer).set({ img: filename }).where(eq(writer.id, writerId));
    return;
  }

  if (mode === "removeImage") {
    if (existing.img) await deleteWriterImageFile(existing.img);
    await db.update(writer).set({ img: null }).where(eq(writer.id, writerId));
    return;
  }

  const text = String(value ?? "").trim();
  if (mode === "name" && !text) throw new Error("Yazar ismi boş bırakılamaz.");
  if (isDirty(text)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");

  switch (mode) {
    case "name":
      await db.update(writer).set({ name: text, slug: slugify(text) }).where(eq(writer.id, writerId));
      break;
    case "biyo":
      await db.update(writer).set({ biyo: text || null }).where(eq(writer.id, writerId));
      break;
    case "date":
      await db.update(writer).set({ date: text || null }).where(eq(writer.id, writerId));
      break;
  }
}

async function deleteWriterRow(writerId: number): Promise<{ name: string; img: string | null } | null> {
  const [existing] = await db.select({ name: writer.name, img: writer.img }).from(writer).where(eq(writer.id, writerId)).limit(1);
  if (!existing) return null;
  await deleteCommentTreeForTarget("writer", writerId);
  await db.delete(writer).where(eq(writer.id, writerId));
  if (existing.img) await deleteWriterImageFile(existing.img);
  return existing;
}

export async function deleteWriter(writerId: number): Promise<void> {
  const deleted = await deleteWriterRow(writerId);
  if (!deleted) throw new Error("Yazar bulunamadı.");
}

export async function deleteWriters(writerIds: number[]): Promise<{ success: number; fail: number }> {
  let success = 0;
  for (const id of writerIds) {
    if (await deleteWriterRow(id)) success++;
  }
  return { success, fail: writerIds.length - success };
}
