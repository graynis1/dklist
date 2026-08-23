import "server-only";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { category } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { slugify } from "@/lib/slugify";

export interface CategoryListItem {
  id: number;
  category: string;
  categoryUs: string | null;
}

export async function getCategoryList(page = 1, pageSize = 20, search = ""): Promise<{ items: CategoryListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${category.category})`, sql`LOWER(${`%${trimmedSearch}%`})`)
    : undefined;
  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(category).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const items = await db.select({ id: category.id, category: category.category, categoryUs: category.categoryUs })
    .from(category).where(whereClause).orderBy(category.id).limit(safeSize).offset((safePage - 1) * safeSize);
  return { items, total, page: safePage, lastPage };
}

export async function createCategory(name: string, nameUs?: string): Promise<CategoryListItem> {
  const trimmed = name.trim();
  if (isDirty(trimmed)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  if (!trimmed) throw new Error("Kategori ismi zorunludur.");
  const [existing] = await db.select({ id: category.id }).from(category).where(eq(category.category, trimmed)).limit(1);
  if (existing) throw new Error(`${trimmed} zaten var.`);
  const trimmedUs = nameUs?.trim() || null;
  const [result] = await db.insert(category).values({
    category: trimmed,
    categoryUs: trimmedUs,
    slug: slugify(trimmed),
    slugEn: trimmedUs ? slugify(trimmedUs) : null,
  });
  return { id: result.insertId, category: trimmed, categoryUs: trimmedUs };
}

export async function updateCategoryField(categoryId: number, mode: "tr" | "us", value: string): Promise<void> {
  const [existing] = await db.select({ id: category.id }).from(category).where(eq(category.id, categoryId)).limit(1);
  if (!existing) throw new Error("Kategori bulunamadı.");
  const text = value.trim();
  if (mode === "tr" && !text) throw new Error("Türkçe kategori ismi boş bırakılamaz.");
  if (isDirty(text)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  if (mode === "tr") {
    await db.update(category).set({ category: text, slug: slugify(text) }).where(eq(category.id, categoryId));
  } else {
    await db.update(category).set({ categoryUs: text || null, slugEn: text ? slugify(text) : null }).where(eq(category.id, categoryId));
  }
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await db.delete(category).where(eq(category.id, categoryId));
}

export async function deleteCategories(categoryIds: number[]): Promise<{ success: number; fail: number }> {
  if (categoryIds.length === 0) return { success: 0, fail: 0 };
  const rows = await db.select({ id: category.id }).from(category).where(inArray(category.id, categoryIds));
  await db.delete(category).where(inArray(category.id, categoryIds));
  return { success: rows.length, fail: categoryIds.length - rows.length };
}
