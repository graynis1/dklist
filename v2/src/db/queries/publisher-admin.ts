import "server-only";
import { eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { deleteBookCascade } from "@/db/queries/entity-delete-cascade";

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PublisherListItem {
  id: number;
  name: string;
  bookCount: number;
}

export async function getPublisherAdminList(page = 1, pageSize = 20, search = ""): Promise<{ items: PublisherListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? like(sql`LOWER(${publisher.name})`, sql`LOWER(${`%${trimmedSearch}%`})`)
    : undefined;

  let total: number;
  if (!trimmedSearch) {
    const rows = (await db.execute(
      sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'publisher'`,
    ))[0] as unknown as { TABLE_ROWS: number }[];
    total = Number(rows[0]?.TABLE_ROWS ?? 0);
  } else {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(publisher).where(whereClause);
    total = Number(countRow?.count ?? 0);
  }

  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);
  const rows = await db.select({ id: publisher.id, name: publisher.name })
    .from(publisher).where(whereClause).orderBy(publisher.id).limit(safeSize).offset((safePage - 1) * safeSize);

  const items: PublisherListItem[] = [];
  for (const row of rows) {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(book).where(eq(book.publisherId, row.id));
    items.push({ id: row.id, name: row.name, bookCount: Number(countRow?.count ?? 0) });
  }

  return { items, total, page: safePage, lastPage };
}

export async function createPublisher(name: string): Promise<PublisherListItem> {
  const trimmed = name.trim();
  if (isDirty(trimmed)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  if (!trimmed) throw new Error("Yayınevi ismi zorunludur.");
  const [existing] = await db.select({ id: publisher.id }).from(publisher).where(eq(publisher.name, trimmed)).limit(1);
  if (existing) throw new Error(`${trimmed} isimli yayınevi zaten var.`);
  const [result] = await db.insert(publisher).values({ name: trimmed, slug: slugify(trimmed) });
  return { id: result.insertId, name: trimmed, bookCount: 0 };
}

export async function updatePublisherName(publisherId: number, newName: string): Promise<void> {
  const [existing] = await db.select({ id: publisher.id }).from(publisher).where(eq(publisher.id, publisherId)).limit(1);
  if (!existing) throw new Error("Yayınevi bulunamadı.");
  const text = newName.trim();
  if (!text) throw new Error("Yayınevi ismi boş bırakılamaz.");
  if (isDirty(text)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  await db.update(publisher).set({ name: text, slug: slugify(text) }).where(eq(publisher.id, publisherId));
}

/**
 * Ports v1's real Publisher::delete() - which cascades to remove EVERY one
 * of the publisher's books (Doctrine `orphanRemoval: true` on
 * Publisher->Book, confirmed by reading the real entity, not assumed). This
 * is a genuinely large-blast-radius admin action on production data - some
 * publishers (especially bulk-import placeholders) can hold thousands of
 * books - faithfully ported here since v1 already behaves this way, not a
 * v2 invention. Each book removal goes through the same deleteBookCascade()
 * used by the direct book-admin delete, so store unlinks, comment cleanup,
 * and edition-parent reparenting all happen correctly per book rather than
 * assuming (as v1's own Publisher::delete() does) that the books have no
 * other referencing rows.
 */
export async function deletePublisher(publisherId: number): Promise<void> {
  const [existing] = await db.select({ id: publisher.id }).from(publisher).where(eq(publisher.id, publisherId)).limit(1);
  if (!existing) throw new Error("Yayınevi bulunamadı.");

  const books = await db.select({ id: book.id }).from(book).where(eq(book.publisherId, publisherId));
  for (const b of books) {
    await deleteBookCascade(b.id);
  }
  await db.delete(publisher).where(eq(publisher.id, publisherId));
}
